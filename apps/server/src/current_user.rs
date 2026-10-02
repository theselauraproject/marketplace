use serde::Serialize;
use sqlx::PgPool;
use tower_cookies::Cookies;
use uuid::Uuid;

use crate::{
    error::ApiError,
    models::{Organization, User},
    session::get_session,
};

pub const SESSION_COOKIE: &str = "selaura_session";

pub async fn get_current_user(pool: &PgPool, cookies: &Cookies) -> sqlx::Result<Option<User>> {
    let Some(session_id) = cookies.get(SESSION_COOKIE).map(|c| c.value().to_string()) else {
        return Ok(None);
    };

    let Some(session) = get_session(pool, &session_id).await? else {
        return Ok(None);
    };

    let user: Option<User> = sqlx::query_as::<_, User>(
        "SELECT id, github_id, username, email, avatar_url, role::text as role, bio, discord_url, website_url, created_at, updated_at \
         FROM users WHERE id = $1",
    )
    .bind(session.user_id)
    .fetch_optional(pool)
    .await?;

    Ok(user)
}

pub async fn require_user(pool: &PgPool, cookies: &Cookies) -> Result<User, ApiError> {
    get_current_user(pool, cookies)
        .await?
        .ok_or_else(|| ApiError::unauthorized("Not authenticated"))
}

pub async fn is_same_person(pool: &PgPool, a: Uuid, b: Uuid) -> sqlx::Result<bool> {
    if a == b {
        return Ok(true);
    }

    let row = sqlx::query(
        "SELECT 1 FROM linked_accounts \
         WHERE (user_a_id = $1 AND user_b_id = $2) \
            OR (user_a_id = $2 AND user_b_id = $1)",
    )
    .bind(a)
    .bind(b)
    .fetch_optional(pool)
    .await?;

    Ok(row.is_some())
}

pub async fn identity_user_ids(pool: &PgPool, user_id: Uuid) -> sqlx::Result<Vec<Uuid>> {
    let rows: Vec<(Uuid,)> = sqlx::query_as(
        "SELECT CASE WHEN user_a_id = $1 THEN user_b_id ELSE user_a_id END \
         FROM linked_accounts \
         WHERE user_a_id = $1 OR user_b_id = $1",
    )
    .bind(user_id)
    .fetch_all(pool)
    .await?;

    let mut ids = vec![user_id];
    ids.extend(rows.into_iter().map(|(id,)| id));

    Ok(ids)
}

pub async fn is_org_member(pool: &PgPool, org_id: Uuid, user_id: Uuid) -> sqlx::Result<bool> {
    let ids = identity_user_ids(pool, user_id).await?;

    let row = sqlx::query(
        "SELECT 1 FROM organization_members WHERE org_id = $1 AND user_id = ANY($2)",
    )
    .bind(org_id)
    .bind(&ids)
    .fetch_optional(pool)
    .await?;

    Ok(row.is_some())
}

#[derive(Debug, Serialize)]
#[serde(tag = "kind", rename_all = "lowercase")]
pub enum ActiveIdentity {
    User {
        id: Uuid,
        username: String,
        #[serde(rename = "avatarUrl")]
        avatar_url: Option<String>,
    },
    Org {
        id: Uuid,
        username: String,
        #[serde(rename = "avatarUrl")]
        avatar_url: Option<String>,
    },
}

pub async fn get_active_identity(
    pool: &PgPool,
    cookies: &Cookies,
) -> sqlx::Result<Option<ActiveIdentity>> {
    let Some(session_id) = cookies.get(SESSION_COOKIE).map(|c| c.value().to_string()) else {
        return Ok(None);
    };

    let Some(session) = get_session(pool, &session_id).await? else {
        return Ok(None);
    };

    if let Some(org_id) = session.acting_as_org_id {
        if is_org_member(pool, org_id, session.user_id).await? {
            let org: Option<Organization> = sqlx::query_as(
                "SELECT id, github_id, login, name, avatar_url FROM organizations WHERE id = $1",
            )
            .bind(org_id)
            .fetch_optional(pool)
            .await?;

            if let Some(org) = org {
                return Ok(Some(ActiveIdentity::Org {
                    id: org.id,
                    username: org.login,
                    avatar_url: org.avatar_url,
                }));
            }
        }
    }

    let mut user_id = session.user_id;

    if let Some(acting_id) = session.acting_as_user_id {
        if is_same_person(pool, session.user_id, acting_id).await? {
            user_id = acting_id;
        }
    }

    let user: Option<User> = sqlx::query_as::<_, User>(
        "SELECT id, github_id, username, email, avatar_url, role::text as role, bio, discord_url, website_url, created_at, updated_at \
         FROM users WHERE id = $1",
    )
    .bind(user_id)
    .fetch_optional(pool)
    .await?;

    Ok(user.map(|u| ActiveIdentity::User {
        id: u.id,
        username: u.username,
        avatar_url: u.avatar_url,
    }))
}
