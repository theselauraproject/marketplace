use std::sync::Arc;

use axum::{
    extract::{Query, State},
    response::{IntoResponse, Redirect},
    Json,
};
use serde::Deserialize;
use serde_json::json;
use sqlx::Row;
use tower_cookies::{
    cookie::{time::OffsetDateTime, Expiration, SameSite},
    Cookie, Cookies,
};
use uuid::Uuid;

use crate::{
    current_user::{get_active_identity, require_user, SESSION_COOKIE},
    error::{ApiError, ApiResult},
    github,
    models::{Organization, PublicUser, User},
    session::{create_session, delete_session, get_session, set_acting_as},
    AppState,
};

fn to_offset_date_time(dt: chrono::DateTime<chrono::Utc>) -> OffsetDateTime {
    OffsetDateTime::from_unix_timestamp(dt.timestamp()).unwrap_or(OffsetDateTime::UNIX_EPOCH)
}

fn session_cookie(session_id: String, expires_at: chrono::DateTime<chrono::Utc>) -> Cookie<'static> {
    Cookie::build((SESSION_COOKIE, session_id))
        .http_only(true)
        .secure(true)
        .same_site(SameSite::None)
        .path("/")
        .expires(Expiration::DateTime(to_offset_date_time(expires_at)))
        .build()
}

const OAUTH_SCOPE: &str = "read:user user:email read:org";

fn github_authorize_url(state: &Arc<AppState>, oauth_state: &str) -> String {
    let params = [
        ("client_id", state.config.github_client_id.as_str()),
        (
            "redirect_uri",
            &format!("{}/api/v1/auth/github/callback", state.config.api_url),
        ),
        ("scope", OAUTH_SCOPE),
        ("state", oauth_state),
    ];

    let query = serde_urlencoded::to_string(params).unwrap_or_default();

    format!("https://github.com/login/oauth/authorize?{query}")
}

pub async fn github_login(State(state): State<Arc<AppState>>) -> impl IntoResponse {
    Redirect::to(&github_authorize_url(&state, "login"))
}

pub async fn github_link(
    State(state): State<Arc<AppState>>,
    cookies: Cookies,
) -> ApiResult<impl IntoResponse> {
    require_user(&state.pool, &cookies).await?;

    Ok(Redirect::to(&github_authorize_url(&state, "link")))
}

#[derive(Deserialize)]
pub struct CallbackQuery {
    code: Option<String>,
    state: Option<String>,
}

async fn upsert_github_user(
    state: &AppState,
    github_user: &github::GitHubUser,
    email: Option<String>,
) -> ApiResult<User> {
    let github_id = github_user.id.to_string();

    let existing: Option<User> = sqlx::query_as::<_, User>(
        "SELECT id, github_id, username, email, avatar_url, role::text as role, created_at, updated_at \
         FROM users WHERE github_id = $1",
    )
    .bind(&github_id)
    .fetch_optional(&state.pool)
    .await?;

    let is_admin = state
        .config
        .admin_github_id
        .as_deref()
        .map(|admin_id| admin_id == github_id)
        .unwrap_or(false);

    let user = if existing.is_some() {
        sqlx::query_as::<_, User>(
            "UPDATE users SET username = $1, email = $2, avatar_url = $3, updated_at = now() \
             WHERE github_id = $4 \
             RETURNING id, github_id, username, email, avatar_url, role::text as role, created_at, updated_at",
        )
        .bind(&github_user.login)
        .bind(&email)
        .bind(&github_user.avatar_url)
        .bind(&github_id)
        .fetch_one(&state.pool)
        .await?
    } else {
        let role = if is_admin { "admin" } else { "user" };

        sqlx::query_as::<_, User>(
            "INSERT INTO users (github_id, username, email, avatar_url, role) \
             VALUES ($1, $2, $3, $4, $5::user_role) \
             RETURNING id, github_id, username, email, avatar_url, role::text as role, created_at, updated_at",
        )
        .bind(&github_id)
        .bind(&github_user.login)
        .bind(&email)
        .bind(&github_user.avatar_url)
        .bind(role)
        .fetch_one(&state.pool)
        .await?
    };

    Ok(user)
}

async fn sync_organizations(state: &AppState, user_id: Uuid, access_token: &str) {
    let orgs = github::get_github_orgs(access_token).await;

    for org in orgs {
        let github_id = org.id.to_string();

        let result: sqlx::Result<Uuid> = async {
            let row = sqlx::query(
                "INSERT INTO organizations (github_id, login, avatar_url) \
                 VALUES ($1, $2, $3) \
                 ON CONFLICT (github_id) DO UPDATE SET \
                    login = EXCLUDED.login, avatar_url = EXCLUDED.avatar_url, updated_at = now() \
                 RETURNING id",
            )
            .bind(&github_id)
            .bind(&org.login)
            .bind(&org.avatar_url)
            .fetch_one(&state.pool)
            .await?;

            row.try_get::<Uuid, _>("id")
        }
        .await;

        let org_id = match result {
            Ok(id) => id,
            Err(err) => {
                tracing::warn!("failed to upsert organization {github_id}: {err}");
                continue;
            }
        };

        if let Err(err) = sqlx::query(
            "INSERT INTO organization_members (org_id, user_id) VALUES ($1, $2) \
             ON CONFLICT DO NOTHING",
        )
        .bind(org_id)
        .bind(user_id)
        .execute(&state.pool)
        .await
        {
            tracing::warn!("failed to record org membership for {github_id}: {err}");
        }
    }
}

pub async fn github_callback(
    State(state): State<Arc<AppState>>,
    cookies: Cookies,
    Query(query): Query<CallbackQuery>,
) -> ApiResult<impl IntoResponse> {
    let Some(code) = query.code else {
        return Err(ApiError::bad_request("Missing GitHub OAuth code"));
    };

    let is_link_flow = query.state.as_deref() == Some("link");

    let access_token = github::exchange_code(&state.config, &code)
        .await
        .map_err(|_| ApiError::internal("GitHub authentication failed"))?;

    let github_user = github::get_github_user(&access_token)
        .await
        .map_err(|_| ApiError::internal("GitHub authentication failed"))?;

    let email = github::get_github_email(&access_token).await;

    if is_link_flow {
        let current_user = require_user(&state.pool, &cookies).await?;

        let linked_user = upsert_github_user(&state, &github_user, email).await?;

        if linked_user.id == current_user.id {

            return Ok(Redirect::to(&state.config.web_url));
        }

        let (a, b) = if current_user.id < linked_user.id {
            (current_user.id, linked_user.id)
        } else {
            (linked_user.id, current_user.id)
        };

        sqlx::query(
            "INSERT INTO linked_accounts (user_a_id, user_b_id) VALUES ($1, $2) \
             ON CONFLICT DO NOTHING",
        )
        .bind(a)
        .bind(b)
        .execute(&state.pool)
        .await?;

        sync_organizations(&state, linked_user.id, &access_token).await;

        return Ok(Redirect::to(&state.config.web_url));
    }

    let user = upsert_github_user(&state, &github_user, email).await?;

    sync_organizations(&state, user.id, &access_token).await;

    let session = create_session(&state.pool, user.id).await?;
    cookies.add(session_cookie(session.id, session.expires_at));

    Ok(Redirect::to(&state.config.web_url))
}

pub async fn me(State(state): State<Arc<AppState>>, cookies: Cookies) -> ApiResult<Json<serde_json::Value>> {
    let Some(session_id) = cookies.get(SESSION_COOKIE).map(|c| c.value().to_string()) else {
        return Err(ApiError::unauthorized("Not authenticated"));
    };

    let session = get_session(&state.pool, &session_id)
        .await?
        .ok_or_else(|| ApiError::unauthorized("Session expired"))?;

    let user: Option<User> = sqlx::query_as::<_, User>(
        "SELECT id, github_id, username, email, avatar_url, role::text as role, created_at, updated_at \
         FROM users WHERE id = $1",
    )
    .bind(session.user_id)
    .fetch_optional(&state.pool)
    .await?;

    let user = user.ok_or_else(|| ApiError::unauthorized("User not found"))?;

    let active_identity = get_active_identity(&state.pool, &cookies).await?;

    Ok(Json(json!({
        "user": PublicUser::from(&user),
        "activeIdentity": active_identity,
    })))
}

pub async fn logout(
    State(state): State<Arc<AppState>>,
    cookies: Cookies,
) -> ApiResult<Json<serde_json::Value>> {
    if let Some(session_id) = cookies.get(SESSION_COOKIE).map(|c| c.value().to_string()) {
        delete_session(&state.pool, &session_id).await?;
    }

    let mut clear = Cookie::from(SESSION_COOKIE);
    clear.set_path("/");
    clear.set_secure(true);
    clear.set_same_site(SameSite::None);
    cookies.remove(clear);

    Ok(Json(json!({ "success": true })))
}

pub async fn list_accounts(
    State(state): State<Arc<AppState>>,
    cookies: Cookies,
) -> ApiResult<Json<serde_json::Value>> {
    let user = require_user(&state.pool, &cookies).await?;

    let linked: Vec<User> = sqlx::query_as::<_, User>(
        "SELECT u.id, u.github_id, u.username, u.email, u.avatar_url, u.role::text as role, \
                u.created_at, u.updated_at \
         FROM linked_accounts la \
         JOIN users u ON u.id = CASE WHEN la.user_a_id = $1 THEN la.user_b_id ELSE la.user_a_id END \
         WHERE la.user_a_id = $1 OR la.user_b_id = $1",
    )
    .bind(user.id)
    .fetch_all(&state.pool)
    .await?;

    let orgs: Vec<Organization> = sqlx::query_as(
        "SELECT o.id, o.github_id, o.login, o.name, o.avatar_url \
         FROM organization_members om \
         JOIN organizations o ON o.id = om.org_id \
         WHERE om.user_id = $1 \
         ORDER BY o.login",
    )
    .bind(user.id)
    .fetch_all(&state.pool)
    .await?;

    let accounts: Vec<serde_json::Value> = std::iter::once(json!({
        "kind": "user",
        "id": user.id,
        "username": user.username,
        "avatarUrl": user.avatar_url,
    }))
    .chain(linked.iter().map(|u| {
        json!({
            "kind": "user",
            "id": u.id,
            "username": u.username,
            "avatarUrl": u.avatar_url,
        })
    }))
    .chain(orgs.iter().map(|o| {
        json!({
            "kind": "org",
            "id": o.id,
            "username": o.login,
            "avatarUrl": o.avatar_url,
        })
    }))
    .collect();

    Ok(Json(json!({ "accounts": accounts })))
}

#[derive(Deserialize)]
pub struct SwitchBody {
    kind: Option<String>,
    id: Option<Uuid>,
}

pub async fn switch_account(
    State(state): State<Arc<AppState>>,
    cookies: Cookies,
    Json(body): Json<SwitchBody>,
) -> ApiResult<Json<serde_json::Value>> {
    let user = require_user(&state.pool, &cookies).await?;

    let session_id = cookies
        .get(SESSION_COOKIE)
        .map(|c| c.value().to_string())
        .ok_or_else(|| ApiError::unauthorized("Not authenticated"))?;

    let (Some(kind), Some(id)) = (body.kind, body.id) else {
        return Err(ApiError::bad_request("kind and id are required"));
    };

    match kind.as_str() {
        "user" => {
            let is_self = id == user.id;

            let is_linked = if is_self {
                true
            } else {
                let row = sqlx::query(
                    "SELECT 1 FROM linked_accounts \
                     WHERE (user_a_id = $1 AND user_b_id = $2) \
                        OR (user_a_id = $2 AND user_b_id = $1)",
                )
                .bind(user.id)
                .bind(id)
                .fetch_optional(&state.pool)
                .await?;

                row.is_some()
            };

            if !is_linked {
                return Err(ApiError::forbidden(
                    "That account isn't linked to yours",
                ));
            }

            let acting_as_user_id = if is_self { None } else { Some(id) };

            set_acting_as(&state.pool, &session_id, acting_as_user_id, None).await?;
        }
        "org" => {
            let is_member = sqlx::query(
                "SELECT 1 FROM organization_members WHERE org_id = $1 AND user_id = $2",
            )
            .bind(id)
            .bind(user.id)
            .fetch_optional(&state.pool)
            .await?
            .is_some();

            if !is_member {
                return Err(ApiError::forbidden(
                    "You're not a member of that organization",
                ));
            }

            set_acting_as(&state.pool, &session_id, None, Some(id)).await?;
        }
        _ => {
            return Err(ApiError::bad_request("kind must be \"user\" or \"org\""));
        }
    }

    let active_identity = get_active_identity(&state.pool, &cookies).await?;

    Ok(Json(json!({ "activeIdentity": active_identity })))
}
