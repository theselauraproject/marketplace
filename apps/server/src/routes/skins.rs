use std::{collections::HashMap, sync::Arc};

use axum::{
    extract::{Multipart, Path, Query, State},
    response::IntoResponse,
    Json,
};
use chrono::{DateTime, Utc};
use serde_json::{json, Value};
use sqlx::{postgres::PgRow, FromRow, Row};
use tower_cookies::Cookies;
use uuid::Uuid;

use crate::{
    current_user::require_user,
    error::{ApiError, ApiResult},
    storage::save_uploaded_file,
    AppState,
};

const VALID_KINDS: &[&str] = &["full", "piece"];
const VALID_VARIANTS: &[&str] = &["classic", "slim"];
const VALID_SLOTS: &[&str] = &[
    "hair",
    "face",
    "headwear",
    "top",
    "jacket",
    "sleeve_left",
    "sleeve_right",
    "legs",
    "shoes",
    "accessory",
    "other",
];

const MAX_NAME_LENGTH: usize = 60;
const MAX_DESCRIPTION_LENGTH: usize = 500;
const MAX_IMAGE_BYTES: usize = 2 * 1024 * 1024;

const PNG_SIGNATURE: [u8; 8] = [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A];

/// Minecraft skin textures are always 64x64 (current format) or the legacy
/// 64x32. Reads width/height straight out of the PNG's IHDR chunk, which is
/// always the first chunk right after the signature — no image-decoding
/// crate needed for just this.
fn read_png_dimensions(bytes: &[u8]) -> Option<(u32, u32)> {
    if bytes.len() < 24 || !bytes.starts_with(&PNG_SIGNATURE) {
        return None;
    }

    if &bytes[12..16] != b"IHDR" {
        return None;
    }

    let width = u32::from_be_bytes(bytes[16..20].try_into().ok()?);
    let height = u32::from_be_bytes(bytes[20..24].try_into().ok()?);

    Some((width, height))
}

fn is_valid_skin_size(width: u32, height: u32) -> bool {
    (width, height) == (64, 64) || (width, height) == (64, 32)
}

struct SkinRow {
    id: Uuid,
    slug: String,
    name: String,
    description: String,
    kind: String,
    piece_slot: Option<String>,
    variant: String,
    image_url: String,
    tags: Option<Vec<String>>,
    author_id: Uuid,
    author_username: String,
    author_avatar_url: Option<String>,
    remixed_from: Option<Vec<Uuid>>,
    downloads: i32,
    created_at: DateTime<Utc>,
}

impl FromRow<'_, PgRow> for SkinRow {
    fn from_row(row: &PgRow) -> sqlx::Result<Self> {
        Ok(SkinRow {
            id: row.try_get("id")?,
            slug: row.try_get("slug")?,
            name: row.try_get("name")?,
            description: row.try_get("description")?,
            kind: row.try_get("kind")?,
            piece_slot: row.try_get("piece_slot")?,
            variant: row.try_get("variant")?,
            image_url: row.try_get("image_url")?,
            tags: row.try_get("tags")?,
            author_id: row.try_get("author_id")?,
            author_username: row.try_get("author_username")?,
            author_avatar_url: row.try_get("author_avatar_url")?,
            remixed_from: row.try_get("remixed_from")?,
            downloads: row.try_get("downloads")?,
            created_at: row.try_get("created_at")?,
        })
    }
}

const SKIN_SELECT: &str = "SELECT
        s.id, s.slug, s.name, s.description, s.kind::text as kind,
        s.piece_slot::text as piece_slot, s.variant::text as variant,
        s.image_url, s.tags, s.author_id, u.username as author_username,
        u.avatar_url as author_avatar_url, s.remixed_from, s.downloads, s.created_at
     FROM skins s
     JOIN users u ON u.id = s.author_id ";

fn skin_json(row: &SkinRow) -> Value {
    json!({
        "id": row.id,
        "slug": row.slug,
        "name": row.name,
        "description": row.description,
        "kind": row.kind,
        "pieceSlot": row.piece_slot,
        "variant": row.variant,
        "imageUrl": row.image_url,
        "tags": row.tags,
        "downloads": row.downloads,
        "createdAt": row.created_at.to_rfc3339(),
        "author": {
            "id": row.author_id,
            "username": row.author_username,
            "avatarUrl": row.author_avatar_url,
        },
    })
}

#[derive(serde::Deserialize)]
pub struct ListQuery {
    kind: Option<String>,
    slot: Option<String>,
    q: Option<String>,
}

pub async fn list_skins(
    State(state): State<Arc<AppState>>,
    Query(query): Query<ListQuery>,
) -> ApiResult<Json<Value>> {
    let kind_filter = query
        .kind
        .as_deref()
        .filter(|k| VALID_KINDS.contains(k));

    let slot_filter = query
        .slot
        .as_deref()
        .filter(|s| VALID_SLOTS.contains(s));

    let search = query
        .q
        .as_deref()
        .map(str::trim)
        .filter(|s| !s.is_empty());

    let mut sql = SKIN_SELECT.to_string();
    let mut clauses: Vec<String> = Vec::new();
    let mut binds: Vec<String> = Vec::new();

    if let Some(kind) = kind_filter {
        binds.push(kind.to_string());
        clauses.push(format!("s.kind = ${}::skin_kind", binds.len()));
    }

    if let Some(slot) = slot_filter {
        binds.push(slot.to_string());
        clauses.push(format!("s.piece_slot = ${}::skin_piece_slot", binds.len()));
    }

    if let Some(term) = search {
        binds.push(format!("%{term}%"));
        clauses.push(format!(
            "(s.name ILIKE ${0} OR EXISTS (SELECT 1 FROM unnest(s.tags) AS tag WHERE tag ILIKE ${0}))",
            binds.len()
        ));
    }

    if !clauses.is_empty() {
        sql.push_str(" WHERE ");
        sql.push_str(&clauses.join(" AND "));
    }

    sql.push_str(" ORDER BY s.created_at DESC LIMIT 200");

    let mut q = sqlx::query_as::<_, SkinRow>(&sql);

    for bind in &binds {
        q = q.bind(bind);
    }

    let rows = q.fetch_all(&state.pool).await?;

    let skins: Vec<Value> = rows.iter().map(skin_json).collect();

    Ok(Json(json!({ "skins": skins })))
}

pub async fn get_skin(
    State(state): State<Arc<AppState>>,
    Path(slug): Path<String>,
) -> ApiResult<Json<Value>> {
    let sql = format!("{SKIN_SELECT} WHERE s.slug = $1");

    let row: Option<SkinRow> = sqlx::query_as(&sql)
        .bind(&slug)
        .fetch_optional(&state.pool)
        .await?;

    let Some(row) = row else {
        return Err(ApiError::not_found("Skin not found"));
    };

    let mut credits: Vec<Value> = Vec::new();

    if let Some(ids) = &row.remixed_from {
        if !ids.is_empty() {
            let credit_sql = format!("{SKIN_SELECT} WHERE s.id = ANY($1)");

            let credit_rows: Vec<SkinRow> = sqlx::query_as(&credit_sql)
                .bind(ids)
                .fetch_all(&state.pool)
                .await?;

            credits = credit_rows
                .iter()
                .map(|r| {
                    json!({
                        "id": r.id,
                        "slug": r.slug,
                        "name": r.name,
                        "kind": r.kind,
                        "pieceSlot": r.piece_slot,
                        "imageUrl": r.image_url,
                        "author": { "username": r.author_username },
                    })
                })
                .collect();
        }
    }

    let mut skin = skin_json(&row);
    skin["remixedFrom"] = json!(credits);

    Ok(Json(json!({ "skin": skin })))
}

fn clean_field(value: Option<&String>, max_len: usize) -> Option<String> {
    value
        .map(|v| v.trim().chars().take(max_len).collect::<String>())
        .filter(|v| !v.is_empty())
}

fn slugify(value: &str) -> String {
    let lower = value.to_lowercase();
    let mut result = String::new();
    let mut last_was_dash = false;

    for c in lower.trim().chars() {
        if c.is_ascii_alphanumeric() {
            result.push(c);
            last_was_dash = false;
        } else if !last_was_dash {
            result.push('-');
            last_was_dash = true;
        }
    }

    result.trim_matches('-').to_string()
}

async fn generate_unique_skin_slug(pool: &sqlx::PgPool, name: &str) -> sqlx::Result<String> {
    let base = {
        let s = slugify(name);
        if s.is_empty() { "skin".to_string() } else { s }
    };

    let mut slug = base.clone();
    let mut attempt = 1;

    loop {
        let existing: Option<(Uuid,)> = sqlx::query_as("SELECT id FROM skins WHERE slug = $1")
            .bind(&slug)
            .fetch_optional(pool)
            .await?;

        if existing.is_none() {
            return Ok(slug);
        }

        attempt += 1;
        slug = format!("{base}-{attempt}");
    }
}

pub async fn create_skin(
    State(state): State<Arc<AppState>>,
    cookies: Cookies,
    mut multipart: Multipart,
) -> ApiResult<impl IntoResponse> {
    let user = require_user(&state.pool, &cookies).await?;

    let mut fields: HashMap<String, String> = HashMap::new();
    let mut image_bytes: Option<Vec<u8>> = None;
    let mut image_name: Option<String> = None;

    while let Some(field) = multipart
        .next_field()
        .await
        .map_err(|e| ApiError::bad_request(format!("Invalid multipart data: {e}")))?
    {
        let name = field.name().unwrap_or("").to_string();

        if name == "file" {
            let file_name = field.file_name().unwrap_or("skin.png").to_string();

            let bytes = field
                .bytes()
                .await
                .map_err(|e| ApiError::bad_request(format!("Failed to read image: {e}")))?;

            if bytes.len() > MAX_IMAGE_BYTES {
                return Err(ApiError::bad_request("Skin image is too large (2MB max)"));
            }

            if !bytes.starts_with(&PNG_SIGNATURE) {
                return Err(ApiError::bad_request(
                    "Skin file must be a PNG image",
                ));
            }

            let Some((width, height)) = read_png_dimensions(&bytes) else {
                return Err(ApiError::bad_request(
                    "Couldn't read that PNG's dimensions",
                ));
            };

            if !is_valid_skin_size(width, height) {
                return Err(ApiError::bad_request(format!(
                    "That's a {width}x{height} image — Minecraft skins must be 64x64 (or the legacy 64x32)"
                )));
            }

            image_bytes = Some(bytes.to_vec());
            image_name = Some(file_name);
        } else {
            let value = field
                .text()
                .await
                .map_err(|e| ApiError::bad_request(format!("Invalid field: {e}")))?;

            fields.insert(name, value);
        }
    }

    let Some(image_bytes) = image_bytes else {
        return Err(ApiError::bad_request("A skin PNG file is required"));
    };

    let name = clean_field(fields.get("name"), MAX_NAME_LENGTH)
        .ok_or_else(|| ApiError::bad_request("A name is required"))?;

    let description = clean_field(fields.get("description"), MAX_DESCRIPTION_LENGTH)
        .unwrap_or_default();

    let kind = fields
        .get("kind")
        .map(|s| s.trim().to_string())
        .filter(|s| VALID_KINDS.contains(&s.as_str()))
        .unwrap_or_else(|| "full".to_string());

    let variant = fields
        .get("variant")
        .map(|s| s.trim().to_string())
        .filter(|s| VALID_VARIANTS.contains(&s.as_str()))
        .unwrap_or_else(|| "classic".to_string());

    let piece_slot = if kind == "piece" {
        let slot = fields
            .get("pieceSlot")
            .map(|s| s.trim().to_string())
            .filter(|s| VALID_SLOTS.contains(&s.as_str()));

        let Some(slot) = slot else {
            return Err(ApiError::bad_request(
                "A piece slot is required for skin pieces",
            ));
        };

        Some(slot)
    } else {
        None
    };

    let tags: Option<Vec<String>> = fields.get("tags").and_then(|raw| {
        let parsed: Vec<String> = serde_json::from_str(raw).unwrap_or_default();

        let mut seen = std::collections::HashSet::new();
        let mut cleaned = Vec::new();

        for tag in parsed {
            let t: String = tag.trim().chars().take(30).collect();
            if !t.is_empty() && seen.insert(t.to_lowercase()) {
                cleaned.push(t);
            }
            if cleaned.len() >= 10 {
                break;
            }
        }

        if cleaned.is_empty() { None } else { Some(cleaned) }
    });

    let remixed_from: Option<Vec<Uuid>> = fields.get("remixedFrom").and_then(|raw| {
        let parsed: Vec<Uuid> = serde_json::from_str(raw).unwrap_or_default();
        if parsed.is_empty() { None } else { Some(parsed) }
    });

    let stored = save_uploaded_file(
        &state.config,
        &image_bytes,
        image_name.as_deref().unwrap_or("skin.png"),
        "skins",
    )
    .await
    .map_err(|e| ApiError::internal(format!("Failed to save skin image: {e}")))?;

    let slug = generate_unique_skin_slug(&state.pool, &name).await?;

    let inserted: (Uuid,) = sqlx::query_as(
        "INSERT INTO skins (
            slug, name, description, kind, piece_slot, variant,
            image_url, tags, author_id, remixed_from
         )
         VALUES ($1, $2, $3, $4::skin_kind, $5::skin_piece_slot, $6::skin_variant, $7, $8, $9, $10)
         RETURNING id",
    )
    .bind(&slug)
    .bind(&name)
    .bind(&description)
    .bind(&kind)
    .bind(&piece_slot)
    .bind(&variant)
    .bind(&stored.url)
    .bind(&tags)
    .bind(user.id)
    .bind(&remixed_from)
    .fetch_one(&state.pool)
    .await?;

    let sql = format!("{SKIN_SELECT} WHERE s.id = $1");

    let row: SkinRow = sqlx::query_as(&sql)
        .bind(inserted.0)
        .fetch_one(&state.pool)
        .await?;

    Ok((
        axum::http::StatusCode::CREATED,
        Json(json!({ "skin": skin_json(&row) })),
    ))
}

pub async fn delete_skin(
    State(state): State<Arc<AppState>>,
    cookies: Cookies,
    Path(slug): Path<String>,
) -> ApiResult<Json<Value>> {
    let user = require_user(&state.pool, &cookies).await?;

    let existing: Option<(Uuid, Uuid, String)> = sqlx::query_as(
        "SELECT id, author_id, image_url FROM skins WHERE slug = $1",
    )
    .bind(&slug)
    .fetch_optional(&state.pool)
    .await?;

    let Some((skin_id, author_id, image_url)) = existing else {
        return Err(ApiError::not_found("Skin not found"));
    };

    if author_id != user.id && !user.is_staff() {
        return Err(ApiError::forbidden(
            "Only the skin's author or staff can delete it",
        ));
    }

    sqlx::query("DELETE FROM skins WHERE id = $1")
        .bind(skin_id)
        .execute(&state.pool)
        .await?;

    let prefix = format!("{}/uploads/", state.config.api_url);

    if let Some(relative) = image_url.strip_prefix(&prefix) {
        let absolute = crate::storage::resolve_upload_path(relative);

        if let Err(err) = tokio::fs::remove_file(&absolute).await {
            tracing::warn!("failed to delete skin image {relative}: {err}");
        }
    }

    Ok(Json(json!({ "success": true })))
}
