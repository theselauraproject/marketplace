use chrono::{DateTime, Duration, Utc};
use rand::RngCore;
use sqlx::PgPool;
use uuid::Uuid;

const SESSION_DURATION_DAYS: i64 = 30;

pub struct Session {
    pub id: String,
    pub user_id: Uuid,
    pub expires_at: DateTime<Utc>,
    pub acting_as_user_id: Option<Uuid>,
    pub acting_as_org_id: Option<Uuid>,
}

pub struct CreatedSession {
    pub id: String,
    pub expires_at: DateTime<Utc>,
}

pub async fn create_session(pool: &PgPool, user_id: Uuid) -> sqlx::Result<CreatedSession> {
    let mut bytes = [0u8; 32];
    rand::thread_rng().fill_bytes(&mut bytes);
    let id = hex::encode(bytes);

    let expires_at = Utc::now() + Duration::days(SESSION_DURATION_DAYS);

    sqlx::query("INSERT INTO sessions (id, user_id, expires_at) VALUES ($1, $2, $3)")
        .bind(&id)
        .bind(user_id)
        .bind(expires_at)
        .execute(pool)
        .await?;

    Ok(CreatedSession { id, expires_at })
}

pub async fn get_session(pool: &PgPool, session_id: &str) -> sqlx::Result<Option<Session>> {
    let row: Option<(String, Uuid, DateTime<Utc>, Option<Uuid>, Option<Uuid>)> = sqlx::query_as(
        "SELECT id, user_id, expires_at, acting_as_user_id, acting_as_org_id \
         FROM sessions WHERE id = $1",
    )
    .bind(session_id)
    .fetch_optional(pool)
    .await?;

    let Some((id, user_id, expires_at, acting_as_user_id, acting_as_org_id)) = row else {
        return Ok(None);
    };

    if expires_at < Utc::now() {
        delete_session(pool, &id).await?;
        return Ok(None);
    }

    Ok(Some(Session {
        id,
        user_id,
        expires_at,
        acting_as_user_id,
        acting_as_org_id,
    }))
}

pub async fn delete_session(pool: &PgPool, session_id: &str) -> sqlx::Result<()> {
    sqlx::query("DELETE FROM sessions WHERE id = $1")
        .bind(session_id)
        .execute(pool)
        .await?;

    Ok(())
}

pub async fn set_acting_as(
    pool: &PgPool,
    session_id: &str,
    acting_as_user_id: Option<Uuid>,
    acting_as_org_id: Option<Uuid>,
) -> sqlx::Result<()> {
    sqlx::query(
        "UPDATE sessions SET acting_as_user_id = $1, acting_as_org_id = $2 WHERE id = $3",
    )
    .bind(acting_as_user_id)
    .bind(acting_as_org_id)
    .bind(session_id)
    .execute(pool)
    .await?;

    Ok(())
}
