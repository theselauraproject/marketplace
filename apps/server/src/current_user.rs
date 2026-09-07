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
        "SELECT id, github_id, username, email, avatar_url, role::text as role, created_at, updated_at \
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

    let user_id = session.acting_as_user_id.unwrap_or(session.user_id);

    let user: Option<User> = sqlx::query_as::<_, User>(
        "SELECT id, github_id, username, email, avatar_url, role::text as role, created_at, updated_at \
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
