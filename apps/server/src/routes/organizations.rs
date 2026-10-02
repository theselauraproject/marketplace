use std::sync::Arc;

use axum::{
    extract::{Path, State},
    Json,
};
use chrono::{DateTime, Utc};
use serde::Deserialize;
use serde_json::{json, Value};
use sqlx::{postgres::PgRow, FromRow, Row};
use tower_cookies::Cookies;
use uuid::Uuid;

use crate::{
    current_user::{get_current_user, is_org_member, require_user},
    error::{ApiError, ApiResult},
    validation::{clean_text, clean_url, MAX_BIO_LENGTH},
    AppState,
};

struct OrgRow {
    id: Uuid,
    login: String,
    name: Option<String>,
    avatar_url: Option<String>,
    bio: Option<String>,
    discord_url: Option<String>,
    website_url: Option<String>,
    created_at: DateTime<Utc>,
}

impl FromRow<'_, PgRow> for OrgRow {
    fn from_row(row: &PgRow) -> sqlx::Result<Self> {
        Ok(OrgRow {
            id: row.try_get("id")?,
            login: row.try_get("login")?,
            name: row.try_get("name")?,
            avatar_url: row.try_get("avatar_url")?,
            bio: row.try_get("bio")?,
            discord_url: row.try_get("discord_url")?,
            website_url: row.try_get("website_url")?,
            created_at: row.try_get("created_at")?,
        })
    }
}

struct OrgProjectRow {
    id: Uuid,
    slug: String,
    name: String,
    description: String,
    project_type: String,
    icon_url: Option<String>,
    header_url: Option<String>,
    tags: Option<Vec<String>>,
    downloads: i32,
    status: String,
    created_at: DateTime<Utc>,
}

impl FromRow<'_, PgRow> for OrgProjectRow {
    fn from_row(row: &PgRow) -> sqlx::Result<Self> {
        Ok(OrgProjectRow {
            id: row.try_get("id")?,
            slug: row.try_get("slug")?,
            name: row.try_get("name")?,
            description: row.try_get("description")?,
            project_type: row.try_get("type")?,
            icon_url: row.try_get("icon_url")?,
            header_url: row.try_get("header_url")?,
            tags: row.try_get("tags")?,
            downloads: row.try_get("downloads")?,
            status: row.try_get("status")?,
            created_at: row.try_get("created_at")?,
        })
    }
}

const ORG_COLUMNS: &str =
    "id, login, name, avatar_url, bio, discord_url, website_url, created_at";

async fn find_org(state: &AppState, login: &str) -> ApiResult<OrgRow> {
    let org: Option<OrgRow> = sqlx::query_as(&format!(
        "SELECT {ORG_COLUMNS} FROM organizations WHERE lower(login) = lower($1)"
    ))
    .bind(login)
    .fetch_optional(&state.pool)
    .await?;

    org.ok_or_else(|| ApiError::not_found("Organization not found"))
}

fn org_json(org: &OrgRow) -> Value {
    json!({
        "id": org.id,
        "login": org.login,
        "name": org.name,
        "avatarUrl": org.avatar_url,
        "bio": org.bio,
        "discordUrl": org.discord_url,
        "websiteUrl": org.website_url,
        "githubUrl": format!("https://github.com/{}", org.login),
        "createdAt": org.created_at.to_rfc3339(),
    })
}

pub async fn get_organization(
    State(state): State<Arc<AppState>>,
    cookies: Cookies,
    Path(login): Path<String>,
) -> ApiResult<Json<Value>> {
    let org = find_org(&state, &login).await?;

    let viewer = get_current_user(&state.pool, &cookies).await?;

    let is_member = match &viewer {
        Some(v) => is_org_member(&state.pool, org.id, v.id).await?,
        None => false,
    };

    let is_staff = viewer.as_ref().map(|v| v.is_staff()).unwrap_or(false);
    let can_see_all = is_member || is_staff;

    let status_filter = if can_see_all {
        ""
    } else {
        "AND status = 'approved'"
    };

    let rows: Vec<OrgProjectRow> = sqlx::query_as(&format!(
        "SELECT id, slug, name, description, type::text as type, icon_url, \
                header_url, tags, downloads, status::text as status, created_at \
         FROM projects \
         WHERE owner_org_id = $1 {status_filter} \
         ORDER BY created_at DESC"
    ))
    .bind(org.id)
    .fetch_all(&state.pool)
    .await?;

    let projects: Vec<Value> = rows
        .iter()
        .map(|row| {
            json!({
                "id": row.id,
                "slug": row.slug,
                "name": row.name,
                "description": row.description,
                "type": row.project_type,
                "iconUrl": row.icon_url,
                "headerUrl": row.header_url,
                "tags": row.tags,
                "downloads": row.downloads,
                "status": row.status,
                "createdAt": row.created_at.to_rfc3339(),
                "author": {
                    "id": org.id,
                    "username": org.login,
                    "avatarUrl": org.avatar_url,
                    "kind": "org",
                },
            })
        })
        .collect();

    let contributor_rows = sqlx::query(
        "SELECT u.id, u.username, u.avatar_url, COUNT(*)::int as project_count \
         FROM projects p \
         JOIN users u ON u.id = p.author_id \
         WHERE p.owner_org_id = $1 AND p.status = 'approved' \
         GROUP BY u.id, u.username, u.avatar_url \
         ORDER BY project_count DESC, lower(u.username)",
    )
    .bind(org.id)
    .fetch_all(&state.pool)
    .await?;

    let contributors: Vec<Value> = contributor_rows
        .iter()
        .map(|row| {
            json!({
                "id": row.get::<Uuid, _>("id"),
                "username": row.get::<String, _>("username"),
                "avatarUrl": row.get::<Option<String>, _>("avatar_url"),
                "projectCount": row.get::<i32, _>("project_count"),
            })
        })
        .collect();

    let member_rows = sqlx::query(
        "SELECT u.id, u.username, u.avatar_url \
         FROM organization_members om \
         JOIN users u ON u.id = om.user_id \
         WHERE om.org_id = $1 \
         ORDER BY lower(u.username)",
    )
    .bind(org.id)
    .fetch_all(&state.pool)
    .await?;

    let members: Vec<Value> = member_rows
        .iter()
        .map(|row| {
            json!({
                "id": row.get::<Uuid, _>("id"),
                "username": row.get::<String, _>("username"),
                "avatarUrl": row.get::<Option<String>, _>("avatar_url"),
            })
        })
        .collect();

    Ok(Json(json!({
        "organization": org_json(&org),
        "projects": projects,
        "contributors": contributors,
        "members": members,
        "canEdit": can_see_all,
    })))
}

#[derive(Deserialize)]
pub struct UpdateOrganizationBody {
    bio: Option<String>,
    #[serde(rename = "discordUrl")]
    discord_url: Option<String>,
    #[serde(rename = "websiteUrl")]
    website_url: Option<String>,
}

pub async fn update_organization(
    State(state): State<Arc<AppState>>,
    cookies: Cookies,
    Path(login): Path<String>,
    Json(body): Json<UpdateOrganizationBody>,
) -> ApiResult<Json<Value>> {
    let user = require_user(&state.pool, &cookies).await?;
    let org = find_org(&state, &login).await?;

    let is_member = is_org_member(&state.pool, org.id, user.id).await?;

    if !is_member && !user.is_staff() {
        return Err(ApiError::forbidden(
            "Only members of this organization can edit its profile",
        ));
    }

    let bio = clean_text(body.bio, MAX_BIO_LENGTH);
    let discord_url = clean_url(body.discord_url)?;
    let website_url = clean_url(body.website_url)?;

    let updated: OrgRow = sqlx::query_as(&format!(
        "UPDATE organizations \
         SET bio = $1, discord_url = $2, website_url = $3, updated_at = now() \
         WHERE id = $4 \
         RETURNING {ORG_COLUMNS}"
    ))
    .bind(&bio)
    .bind(&discord_url)
    .bind(&website_url)
    .bind(org.id)
    .fetch_one(&state.pool)
    .await?;

    Ok(Json(json!({ "organization": org_json(&updated) })))
}
