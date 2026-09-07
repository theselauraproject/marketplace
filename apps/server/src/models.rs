use chrono::{DateTime, Utc};
use serde::Serialize;
use sqlx::{postgres::PgRow, FromRow, Row};
use uuid::Uuid;

#[derive(Debug, Clone)]
pub struct User {
    pub id: Uuid,
    pub github_id: String,
    pub username: String,
    pub email: Option<String>,
    pub avatar_url: Option<String>,
    pub role: String,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

impl FromRow<'_, PgRow> for User {
    fn from_row(row: &PgRow) -> sqlx::Result<Self> {
        Ok(User {
            id: row.try_get("id")?,
            github_id: row.try_get("github_id")?,
            username: row.try_get("username")?,
            email: row.try_get("email")?,
            avatar_url: row.try_get("avatar_url")?,
            role: row.try_get("role")?,
            created_at: row.try_get("created_at")?,
            updated_at: row.try_get("updated_at")?,
        })
    }
}

impl User {
    pub fn is_staff(&self) -> bool {
        self.role == "admin" || self.role == "moderator"
    }
}

#[derive(Debug, Clone)]
pub struct Organization {
    pub id: Uuid,
    pub github_id: String,
    pub login: String,
    pub name: Option<String>,
    pub avatar_url: Option<String>,
}

impl FromRow<'_, PgRow> for Organization {
    fn from_row(row: &PgRow) -> sqlx::Result<Self> {
        Ok(Organization {
            id: row.try_get("id")?,
            github_id: row.try_get("github_id")?,
            login: row.try_get("login")?,
            name: row.try_get("name")?,
            avatar_url: row.try_get("avatar_url")?,
        })
    }
}

#[derive(Debug, Serialize)]
pub struct PublicUser {
    pub id: Uuid,
    pub username: String,
    pub email: Option<String>,
    #[serde(rename = "avatarUrl")]
    pub avatar_url: Option<String>,
    pub role: String,
}

impl From<&User> for PublicUser {
    fn from(u: &User) -> Self {
        PublicUser {
            id: u.id,
            username: u.username.clone(),
            email: u.email.clone(),
            avatar_url: u.avatar_url.clone(),
            role: u.role.clone(),
        }
    }
}
