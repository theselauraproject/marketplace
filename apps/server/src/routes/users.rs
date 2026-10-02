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
    current_user::{get_current_user, is_same_person, require_user},
    error::{ApiError, ApiResult},
    models::{PublicUser, User},
    validation::{clean_text, clean_url, MAX_BIO_LENGTH},
    AppState,
};

struct ProfileProjectRow {
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

impl FromRow<'_, PgRow> for ProfileProjectRow {
    fn from_row(row: &PgRow) -> sqlx::Result<Self> {
        Ok(ProfileProjectRow {
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

struct FeaturedSkinRow {
    id: Uuid,
    slug: String,
    name: String,
    kind: String,
    piece_slot: Option<String>,
    image_url: String,
}

impl FromRow<'_, PgRow> for FeaturedSkinRow {
    fn from_row(row: &PgRow) -> sqlx::Result<Self> {
        Ok(FeaturedSkinRow {
            id: row.try_get("id")?,
            slug: row.try_get("slug")?,
            name: row.try_get("name")?,
            kind: row.try_get("kind")?,
            piece_slot: row.try_get("piece_slot")?,
            image_url: row.try_get("image_url")?,
        })
    }
}

pub async fn get_user_profile(
    State(state): State<Arc<AppState>>,
    cookies: Cookies,
    Path(username): Path<String>,
) -> ApiResult<Json<Value>> {
    let profile_user: Option<User> = sqlx::query_as::<_, User>(
        "SELECT id, github_id, username, email, avatar_url, role::text as role, \
                bio, discord_url, website_url, created_at, updated_at \
         FROM users WHERE lower(username) = lower($1)",
    )
    .bind(&username)
    .fetch_optional(&state.pool)
    .await?;

    let Some(profile_user) = profile_user else {
        return Err(ApiError::not_found("User not found"));
    };

    let viewer = get_current_user(&state.pool, &cookies).await?;

    let is_self = match &viewer {
        Some(v) => is_same_person(&state.pool, v.id, profile_user.id).await?,
        None => false,
    };

    let is_staff_viewer = viewer.as_ref().map(|v| v.is_staff()).unwrap_or(false);

    let can_see_all = is_self || is_staff_viewer;

    let rows: Vec<ProfileProjectRow> = if can_see_all {
        sqlx::query_as(
            "SELECT id, slug, name, description, type::text as type, icon_url, \
                    header_url, tags, downloads, status::text as status, created_at \
             FROM projects \
             WHERE author_id = $1 AND owner_org_id IS NULL \
             ORDER BY created_at DESC",
        )
        .bind(profile_user.id)
        .fetch_all(&state.pool)
        .await?
    } else {
        sqlx::query_as(
            "SELECT id, slug, name, description, type::text as type, icon_url, \
                    header_url, tags, downloads, status::text as status, created_at \
             FROM projects \
             WHERE author_id = $1 AND owner_org_id IS NULL AND status = 'approved' \
             ORDER BY created_at DESC",
        )
        .bind(profile_user.id)
        .fetch_all(&state.pool)
        .await?
    };

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
                    "id": profile_user.id,
                    "username": profile_user.username,
                    "avatarUrl": profile_user.avatar_url,
                    "kind": "user",
                },
            })
        })
        .collect();

    let featured_skin_id: Option<(Option<Uuid>,)> =
        sqlx::query_as("SELECT featured_skin_id FROM users WHERE id = $1")
            .bind(profile_user.id)
            .fetch_optional(&state.pool)
            .await?;

    let featured_skin = if let Some((Some(skin_id),)) = featured_skin_id {
        sqlx::query_as::<_, FeaturedSkinRow>(
            "SELECT id, slug, name, kind::text as kind, piece_slot::text as piece_slot, image_url \
             FROM skins WHERE id = $1",
        )
        .bind(skin_id)
        .fetch_optional(&state.pool)
        .await?
        .map(|row| {
            json!({
                "id": row.id,
                "slug": row.slug,
                "name": row.name,
                "kind": row.kind,
                "pieceSlot": row.piece_slot,
                "imageUrl": row.image_url,
            })
        })
    } else {
        None
    };

    Ok(Json(json!({
        "user": PublicUser::from(&profile_user),
        "projects": projects,
        "featuredSkin": featured_skin,
        "isSelf": is_self,
    })))
}

#[derive(Deserialize)]
pub struct UpdateProfileBody {
    bio: Option<String>,
    #[serde(rename = "discordUrl")]
    discord_url: Option<String>,
    #[serde(rename = "websiteUrl")]
    website_url: Option<String>,
}

async fn resolve_editable_user(
    state: &AppState,
    cookies: &Cookies,
    username: &str,
) -> ApiResult<User> {
    let session_user = require_user(&state.pool, cookies).await?;

    let target: Option<User> = sqlx::query_as::<_, User>(
        "SELECT id, github_id, username, email, avatar_url, role::text as role, \
                bio, discord_url, website_url, created_at, updated_at \
         FROM users WHERE lower(username) = lower($1)",
    )
    .bind(username)
    .fetch_optional(&state.pool)
    .await?;

    let target = target.ok_or_else(|| ApiError::not_found("User not found"))?;

    if !is_same_person(&state.pool, session_user.id, target.id).await? {
        return Err(ApiError::forbidden("You can only edit your own profile"));
    }

    Ok(target)
}

async fn apply_profile_update(
    state: &AppState,
    target_id: Uuid,
    body: UpdateProfileBody,
) -> ApiResult<Json<Value>> {
    let bio = clean_text(body.bio, MAX_BIO_LENGTH);
    let discord_url = clean_url(body.discord_url)?;
    let website_url = clean_url(body.website_url)?;

    let updated: User = sqlx::query_as::<_, User>(
        "UPDATE users SET bio = $1, discord_url = $2, website_url = $3, updated_at = now() \
         WHERE id = $4 \
         RETURNING id, github_id, username, email, avatar_url, role::text as role, \
                   bio, discord_url, website_url, created_at, updated_at",
    )
    .bind(&bio)
    .bind(&discord_url)
    .bind(&website_url)
    .bind(target_id)
    .fetch_one(&state.pool)
    .await?;

    Ok(Json(json!({ "user": PublicUser::from(&updated) })))
}

pub async fn update_profile(
    State(state): State<Arc<AppState>>,
    cookies: Cookies,
    Json(body): Json<UpdateProfileBody>,
) -> ApiResult<Json<Value>> {
    let user = require_user(&state.pool, &cookies).await?;

    apply_profile_update(&state, user.id, body).await
}

pub async fn update_user_profile(
    State(state): State<Arc<AppState>>,
    cookies: Cookies,
    Path(username): Path<String>,
    Json(body): Json<UpdateProfileBody>,
) -> ApiResult<Json<Value>> {
    let target = resolve_editable_user(&state, &cookies, &username).await?;

    apply_profile_update(&state, target.id, body).await
}

#[derive(Deserialize)]
pub struct SetFeaturedSkinBody {
    #[serde(rename = "skinId")]
    skin_id: Option<Uuid>,
}

async fn apply_featured_skin(
    state: &AppState,
    target_id: Uuid,
    skin_id: Option<Uuid>,
) -> ApiResult<Json<Value>> {
    if let Some(skin_id) = skin_id {
        let owned: Option<(Uuid,)> =
            sqlx::query_as(
                "SELECT id FROM skins WHERE id = $1 AND author_id = $2 AND kind = 'full'",
            )
            .bind(skin_id)
            .bind(target_id)
            .fetch_optional(&state.pool)
            .await?;

        if owned.is_none() {
            return Err(ApiError::bad_request(
                "You can only feature a full skin you uploaded",
            ));
        }
    }

    sqlx::query("UPDATE users SET featured_skin_id = $1, updated_at = now() WHERE id = $2")
        .bind(skin_id)
        .bind(target_id)
        .execute(&state.pool)
        .await?;

    Ok(Json(json!({ "success": true })))
}

pub async fn set_featured_skin(
    State(state): State<Arc<AppState>>,
    cookies: Cookies,
    Json(body): Json<SetFeaturedSkinBody>,
) -> ApiResult<Json<Value>> {
    let user = require_user(&state.pool, &cookies).await?;

    apply_featured_skin(&state, user.id, body.skin_id).await
}

pub async fn set_user_featured_skin(
    State(state): State<Arc<AppState>>,
    cookies: Cookies,
    Path(username): Path<String>,
    Json(body): Json<SetFeaturedSkinBody>,
) -> ApiResult<Json<Value>> {
    let target = resolve_editable_user(&state, &cookies, &username).await?;

    apply_featured_skin(&state, target.id, body.skin_id).await
}
