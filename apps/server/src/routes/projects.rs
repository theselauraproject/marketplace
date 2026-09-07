use std::{
    collections::{HashMap, HashSet},
    sync::Arc,
};

use axum::{
    extract::{Multipart, Path, Query, State},
    response::IntoResponse,
    Json,
};
use chrono::{DateTime, Utc};
use serde::Deserialize;
use serde_json::{json, Value};
use sqlx::{postgres::PgRow, FromRow, Row};
use tower_cookies::Cookies;
use uuid::Uuid;

use crate::{
    current_user::{get_active_identity, get_current_user, require_user, ActiveIdentity},
    error::{ApiError, ApiResult},
    metadata::{
        is_valid_project_type, parse_enum_csv, GAME_VERSIONS, PROJECT_ENVIRONMENTS,
        PROJECT_LOADERS, RESOURCE_PACK_RESOLUTIONS,
    },
    storage::save_uploaded_file,
    AppState,
};

const ALLOWED_FILE_EXTENSIONS: &[&str] = &[".mcpack", ".mcaddon", ".mcworld", ".zip"];

fn author_json(
    author_id: Uuid,
    author_username: &str,
    author_avatar_url: &Option<String>,
    owner_org_login: &Option<String>,
    owner_org_avatar_url: &Option<String>,
    owner_org_id: &Option<Uuid>,
) -> Value {
    if let Some(org_id) = owner_org_id {
        json!({
            "id": org_id,
            "username": owner_org_login,
            "avatarUrl": owner_org_avatar_url,
            "kind": "org",
        })
    } else {
        json!({
            "id": author_id,
            "username": author_username,
            "avatarUrl": author_avatar_url,
            "kind": "user",
        })
    }
}

const MAX_README_LENGTH: usize = 100_000;

const MAX_DESCRIPTION_LENGTH: usize = 2_000;

const MAX_PROJECT_NAME_LENGTH: usize = 100;

struct ProjectListRow {
    id: Uuid,
    slug: String,
    name: String,
    description: String,
    readme: String,
    project_type: String,
    icon_url: Option<String>,
    header_url: Option<String>,
    tags: Option<Vec<String>>,
    downloads: i32,
    created_at: DateTime<Utc>,
    updated_at: DateTime<Utc>,
    author_id: Uuid,
    author_username: String,
    author_avatar_url: Option<String>,
    owner_org_id: Option<Uuid>,
    owner_org_login: Option<String>,
    owner_org_avatar_url: Option<String>,
}

impl FromRow<'_, PgRow> for ProjectListRow {
    fn from_row(row: &PgRow) -> sqlx::Result<Self> {
        Ok(ProjectListRow {
            id: row.try_get("id")?,
            slug: row.try_get("slug")?,
            name: row.try_get("name")?,
            description: row.try_get("description")?,
            readme: row.try_get("readme")?,
            project_type: row.try_get("type")?,
            icon_url: row.try_get("icon_url")?,
            header_url: row.try_get("header_url")?,
            tags: row.try_get("tags")?,
            downloads: row.try_get("downloads")?,
            created_at: row.try_get("created_at")?,
            updated_at: row.try_get("updated_at")?,
            author_id: row.try_get("author_id")?,
            author_username: row.try_get("author_username")?,
            author_avatar_url: row.try_get("author_avatar_url")?,
            owner_org_id: row.try_get("owner_org_id")?,
            owner_org_login: row.try_get("owner_org_login")?,
            owner_org_avatar_url: row.try_get("owner_org_avatar_url")?,
        })
    }
}

#[derive(Clone)]
struct VersionRow {
    id: Uuid,
    project_id: Uuid,
    version: String,
    changelog: Option<String>,
    game_versions: Vec<String>,
    loaders: Option<Vec<String>>,
    environments: Option<Vec<String>>,
    resolutions: Option<Vec<String>>,
    file_name: String,
    file_path: String,
    file_size: i32,
    downloads: i32,
    created_at: DateTime<Utc>,
}

impl FromRow<'_, PgRow> for VersionRow {
    fn from_row(row: &PgRow) -> sqlx::Result<Self> {
        Ok(VersionRow {
            id: row.try_get("id")?,
            project_id: row.try_get("project_id")?,
            version: row.try_get("version")?,
            changelog: row.try_get("changelog")?,
            game_versions: row.try_get("game_versions")?,
            loaders: row.try_get("loaders")?,
            environments: row.try_get("environments")?,
            resolutions: row.try_get("resolutions")?,
            file_name: row.try_get("file_name")?,
            file_path: row.try_get("file_path")?,
            file_size: row.try_get("file_size")?,
            downloads: row.try_get("downloads")?,
            created_at: row.try_get("created_at")?,
        })
    }
}

#[derive(Deserialize)]
pub struct SearchQuery {
    q: Option<String>,
}

const SEARCH_RESULT_LIMIT: i64 = 8;

pub async fn search_projects(
    State(state): State<Arc<AppState>>,
    Query(query): Query<SearchQuery>,
) -> ApiResult<Json<Value>> {
    let term = query
        .q
        .as_deref()
        .map(str::trim)
        .unwrap_or("");

    if term.is_empty() {
        return Ok(Json(json!({ "projects": [] })));
    }

    let pattern = format!("%{term}%");

    let rows: Vec<ProjectListRow> = sqlx::query_as(
        "SELECT
            p.id,
            p.slug,
            p.name,
            p.description,
            p.readme,
            p.type::text as type,
            p.icon_url,
            p.header_url,
            p.tags,
            p.downloads,
            p.created_at,
            p.updated_at,
            u.id as author_id,
            u.username as author_username,
            u.avatar_url as author_avatar_url,
            o.id as owner_org_id,
            o.login as owner_org_login,
            o.avatar_url as owner_org_avatar_url
         FROM projects p
         JOIN users u ON p.author_id = u.id
         LEFT JOIN organizations o ON p.owner_org_id = o.id
         WHERE p.status = 'approved'
           AND (
                p.name ILIKE $1
                OR p.description ILIKE $1
                OR EXISTS (
                    SELECT 1 FROM unnest(p.tags) AS tag
                    WHERE tag ILIKE $1
                )
           )
         ORDER BY p.downloads DESC, p.created_at DESC
         LIMIT $2",
    )
    .bind(&pattern)
    .bind(SEARCH_RESULT_LIMIT)
    .fetch_all(&state.pool)
    .await?;

    let result: Vec<Value> = rows
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
                "author": author_json(
                    row.author_id,
                    &row.author_username,
                    &row.author_avatar_url,
                    &row.owner_org_login,
                    &row.owner_org_avatar_url,
                    &row.owner_org_id,
                ),
            })
        })
        .collect();

    Ok(Json(json!({ "projects": result })))
}

pub async fn list_projects(
    State(state): State<Arc<AppState>>,
) -> ApiResult<Json<Value>> {
    let project_rows: Vec<ProjectListRow> = sqlx::query_as(
        "SELECT
            p.id,
            p.slug,
            p.name,
            p.description,
            p.readme,
            p.type::text as type,
            p.icon_url,
            p.header_url,
            p.tags,
            p.downloads,
            p.created_at,
            p.updated_at,
            u.id as author_id,
            u.username as author_username,
            u.avatar_url as author_avatar_url,
            o.id as owner_org_id,
            o.login as owner_org_login,
            o.avatar_url as owner_org_avatar_url
         FROM projects p
         JOIN users u ON p.author_id = u.id
         LEFT JOIN organizations o ON p.owner_org_id = o.id
         WHERE p.status = 'approved'
         ORDER BY p.created_at DESC",
    )
    .fetch_all(&state.pool)
    .await?;

    if project_rows.is_empty() {
        return Ok(Json(json!({
            "projects": [],
            "total": 0
        })));
    }

    let project_ids: Vec<Uuid> = project_rows.iter().map(|r| r.id).collect();

    let version_rows: Vec<VersionRow> = sqlx::query_as(
        "SELECT
            id,
            project_id,
            version,
            changelog,
            game_versions::text[] as game_versions,
            loaders::text[] as loaders,
            environments::text[] as environments,
            resolutions::text[] as resolutions,
            file_name,
            file_path,
            file_size,
            downloads,
            created_at
         FROM project_versions
         WHERE project_id = ANY($1)",
    )
    .bind(&project_ids)
    .fetch_all(&state.pool)
    .await?;

    let mut latest_by_project: HashMap<Uuid, VersionRow> = HashMap::new();

    for version in version_rows {
        latest_by_project
            .entry(version.project_id)
            .and_modify(|current| {
                if version.created_at > current.created_at {
                    *current = version.clone();
                }
            })
            .or_insert(version);
    }

    let result: Vec<Value> = project_rows
        .iter()
        .map(|row| {
            let latest = latest_by_project.get(&row.id);

            json!({
                "id": row.id,
                "slug": row.slug,
                "name": row.name,
                "description": row.description,
                "readme": row.readme,
                "type": row.project_type,
                "iconUrl": row.icon_url,
                "headerUrl": row.header_url,
                "tags": row.tags,
                "downloads": row.downloads,
                "createdAt": row.created_at.to_rfc3339(),
                "updatedAt": row.updated_at.to_rfc3339(),

                "author": author_json(
                    row.author_id,
                    &row.author_username,
                    &row.author_avatar_url,
                    &row.owner_org_login,
                    &row.owner_org_avatar_url,
                    &row.owner_org_id,
                ),

                "gameVersions": latest
                    .map(|v| v.game_versions.clone())
                    .unwrap_or_default(),

                "loaders": latest.and_then(|v| v.loaders.clone()),
                "environments": latest.and_then(|v| v.environments.clone()),
                "resolutions": latest.and_then(|v| v.resolutions.clone()),
            })
        })
        .collect();

    Ok(Json(json!({
        "projects": result,
        "total": result.len()
    })))
}

struct ProjectDetailRow {
    id: Uuid,
    slug: String,
    name: String,
    description: String,
    readme: String,
    project_type: String,
    icon_url: Option<String>,
    header_url: Option<String>,
    tags: Option<Vec<String>>,
    moderation_note: Option<String>,
    downloads: i32,
    status: String,
    author_id: Uuid,
    created_at: DateTime<Utc>,
    updated_at: DateTime<Utc>,
    author_username: String,
    author_avatar_url: Option<String>,
    owner_org_id: Option<Uuid>,
    owner_org_login: Option<String>,
    owner_org_avatar_url: Option<String>,
}

impl FromRow<'_, PgRow> for ProjectDetailRow {
    fn from_row(row: &PgRow) -> sqlx::Result<Self> {
        Ok(ProjectDetailRow {
            id: row.try_get("id")?,
            slug: row.try_get("slug")?,
            name: row.try_get("name")?,
            description: row.try_get("description")?,
            readme: row.try_get("readme")?,
            project_type: row.try_get("type")?,
            icon_url: row.try_get("icon_url")?,
            header_url: row.try_get("header_url")?,
            tags: row.try_get("tags")?,
            moderation_note: row.try_get("moderation_note")?,
            downloads: row.try_get("downloads")?,
            status: row.try_get("status")?,
            author_id: row.try_get("author_id")?,
            created_at: row.try_get("created_at")?,
            updated_at: row.try_get("updated_at")?,
            author_username: row.try_get("author_username")?,
            author_avatar_url: row.try_get("author_avatar_url")?,
            owner_org_id: row.try_get("owner_org_id")?,
            owner_org_login: row.try_get("owner_org_login")?,
            owner_org_avatar_url: row.try_get("owner_org_avatar_url")?,
        })
    }
}

async fn can_manage_project(
    pool: &sqlx::PgPool,
    user: &crate::models::User,
    author_id: Uuid,
    owner_org_id: Option<Uuid>,
) -> sqlx::Result<bool> {
    if user.is_staff() || user.id == author_id {
        return Ok(true);
    }

    let is_linked = sqlx::query(
        "SELECT 1 FROM linked_accounts \
         WHERE (user_a_id = $1 AND user_b_id = $2) \
            OR (user_a_id = $2 AND user_b_id = $1)",
    )
    .bind(user.id)
    .bind(author_id)
    .fetch_optional(pool)
    .await?
    .is_some();

    if is_linked {
        return Ok(true);
    }

    if let Some(org_id) = owner_org_id {
        let is_member = sqlx::query(
            "SELECT 1 FROM organization_members WHERE org_id = $1 AND user_id = $2",
        )
        .bind(org_id)
        .bind(user.id)
        .fetch_optional(pool)
        .await?
        .is_some();

        if is_member {
            return Ok(true);
        }
    }

    Ok(false)
}

pub async fn get_project(
    State(state): State<Arc<AppState>>,
    cookies: Cookies,
    Path(slug): Path<String>,
) -> ApiResult<Json<Value>> {
    let row: Option<ProjectDetailRow> = sqlx::query_as(
        "SELECT
            p.id,
            p.slug,
            p.name,
            p.description,
            p.readme,
            p.type::text as type,
            p.icon_url,
            p.header_url,
            p.tags,
            p.moderation_note,
            p.downloads,
            p.status::text as status,
            p.author_id,
            p.created_at,
            p.updated_at,
            u.username as author_username,
            u.avatar_url as author_avatar_url,
            o.id as owner_org_id,
            o.login as owner_org_login,
            o.avatar_url as owner_org_avatar_url
         FROM projects p
         JOIN users u ON p.author_id = u.id
         LEFT JOIN organizations o ON p.owner_org_id = o.id
         WHERE p.slug = $1",
    )
    .bind(&slug)
    .fetch_optional(&state.pool)
    .await?;

    let Some(project) = row else {
        return Err(ApiError::not_found("Project not found"));
    };

    if project.status != "approved" {
        let current_user = get_current_user(&state.pool, &cookies).await?;

        let can_view = match &current_user {
            Some(u) => {
                can_manage_project(&state.pool, u, project.author_id, project.owner_org_id)
                    .await?
            }
            None => false,
        };

        if !can_view {
            return Err(ApiError::not_found("Project not found"));
        }
    }

    let versions: Vec<VersionRow> = sqlx::query_as(
        "SELECT
            id,
            project_id,
            version,
            changelog,
            game_versions::text[] as game_versions,
            loaders::text[] as loaders,
            environments::text[] as environments,
            resolutions::text[] as resolutions,
            file_name,
            file_path,
            file_size,
            downloads,
            created_at
         FROM project_versions
         WHERE project_id = $1
         ORDER BY created_at DESC",
    )
    .bind(project.id)
    .fetch_all(&state.pool)
    .await?;

    let versions_json: Vec<Value> = versions
        .iter()
        .map(|v| {
            json!({
                "id": v.id,
                "version": v.version,
                "changelog": v.changelog,
                "gameVersions": v.game_versions,
                "loaders": v.loaders,
                "environments": v.environments,
                "resolutions": v.resolutions,
                "fileName": v.file_name,
                "fileSize": v.file_size,
                "downloads": v.downloads,
                "downloadUrl": format!(
                    "{}/api/v1/versions/{}/download",
                    state.config.api_url,
                    v.id
                ),
                "createdAt": v.created_at.to_rfc3339(),
            })
        })
        .collect();

    Ok(Json(json!({
        "project": {
            "id": project.id,
            "slug": project.slug,
            "name": project.name,
            "description": project.description,
            "readme": project.readme,
            "type": project.project_type,
            "iconUrl": project.icon_url,
            "headerUrl": project.header_url,
            "tags": project.tags,
            "moderationNote": project.moderation_note,
            "downloads": project.downloads,
            "status": project.status,
            "createdAt": project.created_at.to_rfc3339(),
            "updatedAt": project.updated_at.to_rfc3339(),

            "author": author_json(
                project.author_id,
                &project.author_username,
                &project.author_avatar_url,
                &project.owner_org_login,
                &project.owner_org_avatar_url,
                &project.owner_org_id,
            ),
        },

        "versions": versions_json,
    })))
}

struct UploadFields {
    fields: HashMap<String, String>,
    icon_url: Option<String>,
    header_url: Option<String>,
    version_file: Option<crate::storage::StoredFile>,
}

async fn consume_multipart(
    state: &AppState,
    mut multipart: Multipart,
    accept_icon: bool,
) -> ApiResult<UploadFields> {
    let mut fields = HashMap::new();
    let mut icon_url = None;
    let mut header_url = None;
    let mut version_file = None;

    while let Some(field) = multipart
        .next_field()
        .await
        .map_err(|e| ApiError::bad_request(format!("Invalid multipart data: {e}")))?
    {
        let name = field.name().unwrap_or("").to_string();
        let file_name = field.file_name().map(|f| f.to_string());

        if let Some(file_name) = file_name {
            if accept_icon && name == "icon" {
                let bytes = field
                    .bytes()
                    .await
                    .map_err(|e| {
                        ApiError::bad_request(format!(
                            "Failed to read icon: {e}"
                        ))
                    })?;

                let stored = save_uploaded_file(
                    &state.config,
                    &bytes,
                    &file_name,
                    "icons",
                )
                .await
                .map_err(|e| {
                    ApiError::internal(format!(
                        "Failed to save icon: {e}"
                    ))
                })?;

                icon_url = Some(stored.url);
            } else if accept_icon && name == "header" {
                let bytes = field
                    .bytes()
                    .await
                    .map_err(|e| {
                        ApiError::bad_request(format!(
                            "Failed to read header: {e}"
                        ))
                    })?;

                let stored = save_uploaded_file(
                    &state.config,
                    &bytes,
                    &file_name,
                    "headers",
                )
                .await
                .map_err(|e| {
                    ApiError::internal(format!(
                        "Failed to save header image: {e}"
                    ))
                })?;

                header_url = Some(stored.url);
            } else if name == "file" {
                let extension = file_name
                    .rfind('.')
                    .map(|i| file_name[i..].to_lowercase())
                    .unwrap_or_default();

                if !ALLOWED_FILE_EXTENSIONS
                    .contains(&extension.as_str())
                {
                    return Err(ApiError::bad_request(format!(
                        "Unsupported file type: {extension}. Allowed: {}",
                        ALLOWED_FILE_EXTENSIONS.join(", ")
                    )));
                }

                let bytes = field
                    .bytes()
                    .await
                    .map_err(|e| {
                        ApiError::bad_request(format!(
                            "Failed to read file: {e}"
                        ))
                    })?;

                let stored = save_uploaded_file(
                    &state.config,
                    &bytes,
                    &file_name,
                    "versions",
                )
                .await
                .map_err(|e| {
                    ApiError::internal(format!(
                        "Failed to save file: {e}"
                    ))
                })?;

                version_file = Some(stored);
            }

        } else {
            let value = field
                .text()
                .await
                .map_err(|e| {
                    ApiError::bad_request(format!(
                        "Invalid field: {e}"
                    ))
                })?;

            fields.insert(name, value);
        }
    }

    Ok(UploadFields {
        fields,
        icon_url,
        header_url,
        version_file,
    })
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

async fn generate_unique_slug(
    pool: &sqlx::PgPool,
    name: &str,
) -> sqlx::Result<String> {
    let base = {
        let s = slugify(name);

        if s.is_empty() {
            "project".to_string()
        } else {
            s
        }
    };

    let mut slug = base.clone();
    let mut attempt = 1;

    loop {
        let existing: Option<(Uuid,)> =
            sqlx::query_as("SELECT id FROM projects WHERE slug = $1")
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

fn opt_vec(v: Vec<String>) -> Option<Vec<String>> {
    if v.is_empty() {
        None
    } else {
        Some(v)
    }
}

fn parse_tags(raw: Option<&String>) -> Vec<String> {
    let Some(raw) = raw else {
        return Vec::new();
    };

    let parsed: Vec<String> =
        serde_json::from_str(raw).unwrap_or_default();

    let mut seen = HashSet::new();
    let mut result = Vec::new();

    for tag in parsed {
        let cleaned: String = tag
            .trim()
            .chars()
            .take(30)
            .collect();

        if cleaned.is_empty() {
            continue;
        }

        if seen.insert(cleaned.to_lowercase()) {
            result.push(cleaned);
        }

        if result.len() >= 10 {
            break;
        }
    }

    result
}

fn parse_readme(raw: Option<&String>) -> String {
    let Some(raw) = raw else {
        return String::new();
    };

    raw.trim()
        .chars()
        .take(MAX_README_LENGTH)
        .collect()
}

fn parse_project_name(raw: Option<&String>) -> Option<String> {
    raw.map(|value| {
        value
            .trim()
            .chars()
            .take(MAX_PROJECT_NAME_LENGTH)
            .collect::<String>()
    })
    .filter(|value| !value.is_empty())
}

fn parse_description(raw: Option<&String>) -> Option<String> {
    raw.map(|value| {
        value
            .trim()
            .chars()
            .take(MAX_DESCRIPTION_LENGTH)
            .collect::<String>()
    })
    .filter(|value| !value.is_empty())
}

pub async fn create_project(
    State(state): State<Arc<AppState>>,
    cookies: Cookies,
    multipart: Multipart,
) -> ApiResult<impl IntoResponse> {
    let user = require_user(&state.pool, &cookies).await?;

    let active_identity = get_active_identity(&state.pool, &cookies).await?;

    let (effective_author_id, effective_author_username, owner_org_id, owner_org_login, owner_org_avatar_url) =
        match active_identity {
            Some(ActiveIdentity::User { id, username, .. }) => {
                (id, username, None, None, None)
            }
            Some(ActiveIdentity::Org {
                id,
                username,
                avatar_url,
            }) => (user.id, user.username.clone(), Some(id), Some(username), avatar_url),
            None => (user.id, user.username.clone(), None, None, None),
        };

    let upload = consume_multipart(
        &state,
        multipart,
        true,
    )
    .await?;

    let fields = upload.fields;

    let name = parse_project_name(fields.get("name"));

    let description = parse_description(
        fields.get("description"),
    );

    let project_type = fields
        .get("type")
        .map(|s| s.trim().to_string())
        .filter(|s| !s.is_empty());

    let version_label = fields
        .get("version")
        .map(|s| s.trim().to_string())
        .filter(|s| !s.is_empty())
        .unwrap_or_else(|| "1.0.0".to_string());

    let (Some(name), Some(description), Some(project_type)) =
        (name, description, project_type)
    else {
        return Err(ApiError::bad_request(
            "Missing required fields: name, description, type",
        ));
    };

    if !is_valid_project_type(&project_type) {
        return Err(ApiError::bad_request(format!(
            "Invalid project type: {project_type}"
        )));
    }

    let Some(version_file) = upload.version_file else {
        return Err(ApiError::bad_request(
            "A project file is required",
        ));
    };

    let game_versions = parse_enum_csv(
        fields.get("gameVersions").map(|s| s.as_str()),
        GAME_VERSIONS,
    );

    if game_versions.is_empty() {
        return Err(ApiError::bad_request(
            "At least one supported game version is required",
        ));
    }

    let valid_loaders: Vec<&str> = PROJECT_LOADERS
        .iter()
        .map(|(value, _)| *value)
        .collect();

    let valid_environments: Vec<&str> = PROJECT_ENVIRONMENTS
        .iter()
        .map(|(value, _)| *value)
        .collect();

    let loaders = opt_vec(parse_enum_csv(
        fields.get("loaders").map(|s| s.as_str()),
        &valid_loaders,
    ));

    let environments = opt_vec(parse_enum_csv(
        fields.get("environments").map(|s| s.as_str()),
        &valid_environments,
    ));

    let resolutions = opt_vec(parse_enum_csv(
        fields.get("resolutions").map(|s| s.as_str()),
        RESOURCE_PACK_RESOLUTIONS,
    ));

    let tags = opt_vec(parse_tags(fields.get("tags")));

    let readme = parse_readme(fields.get("readme"));

    let slug = generate_unique_slug(
        &state.pool,
        &name,
    )
    .await?;

    let project: ProjectDetailRow = sqlx::query_as(
        "INSERT INTO projects (
            slug,
            name,
            description,
            readme,
            type,
            author_id,
            icon_url,
            header_url,
            tags,
            owner_org_id
         )
         VALUES (
            $1,
            $2,
            $3,
            $4,
            $5::project_type,
            $6,
            $7,
            $8,
            $9,
            $10
         )
         RETURNING
            id,
            slug,
            name,
            description,
            readme,
            type::text as type,
            icon_url,
            header_url,
            tags,
            moderation_note,
            downloads,
            status::text as status,
            author_id,
            created_at,
            updated_at,
            $11::text as author_username,
            NULL::text as author_avatar_url,
            owner_org_id,
            NULL::text as owner_org_login,
            NULL::text as owner_org_avatar_url",
    )
    .bind(&slug)
    .bind(&name)
    .bind(&description)
    .bind(&readme)
    .bind(&project_type)
    .bind(effective_author_id)
    .bind(&upload.icon_url)
    .bind(&upload.header_url)
    .bind(&tags)
    .bind(owner_org_id)
    .bind(&effective_author_username)
    .fetch_one(&state.pool)
    .await?;

    let version: VersionRow = sqlx::query_as(
        "INSERT INTO project_versions (
            project_id,
            version,
            changelog,
            game_versions,
            loaders,
            environments,
            resolutions,
            file_name,
            file_path,
            file_size
         )
         VALUES (
            $1,
            $2,
            $3,
            $4::game_version[],
            $5::project_loader[],
            $6::project_environment[],
            $7::resource_pack_resolution[],
            $8,
            $9,
            $10
         )
         RETURNING
            id,
            project_id,
            version,
            changelog,
            game_versions::text[] as game_versions,
            loaders::text[] as loaders,
            environments::text[] as environments,
            resolutions::text[] as resolutions,
            file_name,
            file_path,
            file_size,
            downloads,
            created_at",
    )
    .bind(project.id)
    .bind(&version_label)
    .bind(fields.get("changelog"))
    .bind(&game_versions)
    .bind(&loaders)
    .bind(&environments)
    .bind(&resolutions)
    .bind(&version_file.file_name)
    .bind(&version_file.file_path)
    .bind(version_file.size)
    .fetch_one(&state.pool)
    .await?;

    Ok((
        axum::http::StatusCode::CREATED,
        Json(json!({
            "project": {
                "id": project.id,
                "slug": project.slug,
                "name": project.name,
                "description": project.description,
                "readme": project.readme,
                "type": project.project_type,
                "status": project.status,
                "downloads": project.downloads,
                "iconUrl": project.icon_url,
                "headerUrl": project.header_url,
                "tags": project.tags,
                "moderationNote": project.moderation_note,
                "createdAt": project.created_at.to_rfc3339(),
                "updatedAt": project.updated_at.to_rfc3339(),
                "author": author_json(
                    project.author_id,
                    &effective_author_username,
                    &None,
                    &owner_org_login,
                    &owner_org_avatar_url,
                    &owner_org_id,
                ),
            },

            "version": {
                "id": version.id,
                "projectId": version.project_id,
                "version": version.version,
                "changelog": version.changelog,
                "gameVersions": version.game_versions,
                "loaders": version.loaders,
                "environments": version.environments,
                "resolutions": version.resolutions,
                "fileName": version.file_name,
                "filePath": version.file_path,
                "fileSize": version.file_size,
                "downloads": version.downloads,
                "createdAt": version.created_at.to_rfc3339(),
            },
        })),
    ))
}

pub async fn create_version(
    State(state): State<Arc<AppState>>,
    cookies: Cookies,
    Path(slug): Path<String>,
    multipart: Multipart,
) -> ApiResult<impl IntoResponse> {
    let user = require_user(
        &state.pool,
        &cookies,
    )
    .await?;

    let project: Option<(Uuid, Uuid, Option<Uuid>)> =
        sqlx::query_as(
            "SELECT id, author_id, owner_org_id
             FROM projects
             WHERE slug = $1",
        )
        .bind(&slug)
        .fetch_optional(&state.pool)
        .await?;

    let Some((project_id, author_id, owner_org_id)) = project else {
        return Err(ApiError::not_found(
            "Project not found",
        ));
    };

    if !can_manage_project(&state.pool, &user, author_id, owner_org_id).await? {
        return Err(ApiError::forbidden(
            "Only the project author can add versions",
        ));
    }

    let upload = consume_multipart(
        &state,
        multipart,
        false,
    )
    .await?;

    let fields = upload.fields;

    let version_label = fields
        .get("version")
        .map(|s| s.trim().to_string())
        .filter(|s| !s.is_empty());

    let Some(version_label) = version_label else {
        return Err(ApiError::bad_request(
            "A version label is required",
        ));
    };

    let Some(version_file) = upload.version_file else {
        return Err(ApiError::bad_request(
            "A project file is required",
        ));
    };

    let game_versions = parse_enum_csv(
        fields.get("gameVersions").map(|s| s.as_str()),
        GAME_VERSIONS,
    );

    if game_versions.is_empty() {
        return Err(ApiError::bad_request(
            "At least one supported game version is required",
        ));
    }

    let valid_loaders: Vec<&str> = PROJECT_LOADERS
        .iter()
        .map(|(value, _)| *value)
        .collect();

    let valid_environments: Vec<&str> = PROJECT_ENVIRONMENTS
        .iter()
        .map(|(value, _)| *value)
        .collect();

    let loaders = opt_vec(parse_enum_csv(
        fields.get("loaders").map(|s| s.as_str()),
        &valid_loaders,
    ));

    let environments = opt_vec(parse_enum_csv(
        fields.get("environments").map(|s| s.as_str()),
        &valid_environments,
    ));

    let resolutions = opt_vec(parse_enum_csv(
        fields.get("resolutions").map(|s| s.as_str()),
        RESOURCE_PACK_RESOLUTIONS,
    ));

    let version: VersionRow = sqlx::query_as(
        "INSERT INTO project_versions (
            project_id,
            version,
            changelog,
            game_versions,
            loaders,
            environments,
            resolutions,
            file_name,
            file_path,
            file_size
         )
         VALUES (
            $1,
            $2,
            $3,
            $4::game_version[],
            $5::project_loader[],
            $6::project_environment[],
            $7::resource_pack_resolution[],
            $8,
            $9,
            $10
         )
         RETURNING
            id,
            project_id,
            version,
            changelog,
            game_versions::text[] as game_versions,
            loaders::text[] as loaders,
            environments::text[] as environments,
            resolutions::text[] as resolutions,
            file_name,
            file_path,
            file_size,
            downloads,
            created_at",
    )
    .bind(project_id)
    .bind(&version_label)
    .bind(fields.get("changelog"))
    .bind(&game_versions)
    .bind(&loaders)
    .bind(&environments)
    .bind(&resolutions)
    .bind(&version_file.file_name)
    .bind(&version_file.file_path)
    .bind(version_file.size)
    .fetch_one(&state.pool)
    .await?;

    sqlx::query(
        "UPDATE projects
         SET updated_at = now()
         WHERE id = $1",
    )
    .bind(project_id)
    .execute(&state.pool)
    .await?;

    Ok((
        axum::http::StatusCode::CREATED,
        Json(json!({
            "version": {
                "id": version.id,
                "projectId": version.project_id,
                "version": version.version,
                "changelog": version.changelog,
                "gameVersions": version.game_versions,
                "loaders": version.loaders,
                "environments": version.environments,
                "resolutions": version.resolutions,
                "fileName": version.file_name,
                "filePath": version.file_path,
                "fileSize": version.file_size,
                "downloads": version.downloads,
                "createdAt": version.created_at.to_rfc3339(),
            },
        })),
    ))
}

pub async fn download_version(
    State(state): State<Arc<AppState>>,
    Path(id): Path<Uuid>,
) -> ApiResult<impl IntoResponse> {
    let version: Option<(Uuid, String, String)> =
        sqlx::query_as(
            "SELECT id, file_path, file_name
             FROM project_versions
             WHERE id = $1",
        )
        .bind(id)
        .fetch_optional(&state.pool)
        .await?;

    let Some((version_id, file_path, file_name)) = version else {
        return Err(ApiError::not_found(
            "Version not found",
        ));
    };

    sqlx::query(
        "UPDATE project_versions
         SET downloads = downloads + 1
         WHERE id = $1",
    )
    .bind(version_id)
    .execute(&state.pool)
    .await?;

    sqlx::query(
        "UPDATE projects
         SET downloads = downloads + 1
         WHERE id = (
             SELECT project_id
             FROM project_versions
             WHERE id = $1
         )",
    )
    .bind(version_id)
    .execute(&state.pool)
    .await?;

    let absolute_path =
        crate::storage::resolve_upload_path(&file_path);

    let bytes = tokio::fs::read(&absolute_path)
        .await
        .map_err(|_| {
            ApiError::internal(
                "Failed to read file",
            )
        })?;

    let content_disposition = format!(
        "attachment; filename=\"{}\"",
        sanitize_content_disposition_filename(
            &file_name
        )
    );

    let content_type = mime_guess::from_path(&file_name)
        .first_or_octet_stream()
        .to_string();

    Ok((
        [
            (
                axum::http::header::CONTENT_DISPOSITION,
                content_disposition,
            ),
            (
                axum::http::header::CONTENT_TYPE,
                content_type,
            ),
        ],
        bytes,
    ))
}

fn sanitize_content_disposition_filename(
    name: &str,
) -> String {
    name.chars()
        .filter(|c| {
            !matches!(
                c,
                '"' | '\\' | '\r' | '\n'
            )
        })
        .collect()
}

struct ModerationRow {
    id: Uuid,
    slug: String,
    name: String,
    description: String,
    project_type: String,
    status: String,
    moderation_note: Option<String>,
    created_at: DateTime<Utc>,
    author_username: String,
    author_avatar_url: Option<String>,
}

impl FromRow<'_, PgRow> for ModerationRow {
    fn from_row(row: &PgRow) -> sqlx::Result<Self> {
        Ok(ModerationRow {
            id: row.try_get("id")?,
            slug: row.try_get("slug")?,
            name: row.try_get("name")?,
            description: row.try_get("description")?,
            project_type: row.try_get("type")?,
            status: row.try_get("status")?,
            moderation_note: row.try_get("moderation_note")?,
            created_at: row.try_get("created_at")?,
            author_username: row.try_get("author_username")?,
            author_avatar_url: row.try_get("author_avatar_url")?,
        })
    }
}

const MODERATION_STATUSES: &[&str] = &[
    "pending",
    "approved",
    "rejected",
    "hidden",
];

pub async fn moderation_queue(
    State(state): State<Arc<AppState>>,
    cookies: Cookies,
    Query(query): Query<HashMap<String, String>>,
) -> ApiResult<Json<Value>> {
    let user = require_user(
        &state.pool,
        &cookies,
    )
    .await?;

    if !user.is_staff() {
        return Err(ApiError::forbidden(
            "Staff only",
        ));
    }

    let status_filter = query
        .get("status")
        .map(|s| s.as_str())
        .unwrap_or("pending");

    if status_filter != "all"
        && !MODERATION_STATUSES.contains(&status_filter)
    {
        return Err(ApiError::bad_request(format!(
            "status must be one of: all, {}",
            MODERATION_STATUSES.join(", ")
        )));
    }

    let base_query =
        "SELECT
            p.id,
            p.slug,
            p.name,
            p.description,
            p.type::text as type,
            p.status::text as status,
            p.moderation_note,
            p.created_at,
            u.username as author_username,
            u.avatar_url as author_avatar_url
         FROM projects p
         JOIN users u ON p.author_id = u.id ";

    let rows: Vec<ModerationRow> =
        if status_filter == "all" {
            sqlx::query_as(&format!(
                "{base_query}
                 ORDER BY p.created_at DESC"
            ))
            .fetch_all(&state.pool)
            .await?
        } else {
            sqlx::query_as(&format!(
                "{base_query}
                 WHERE p.status = $1::project_status
                 ORDER BY p.created_at DESC"
            ))
            .bind(status_filter)
            .fetch_all(&state.pool)
            .await?
        };

    let result: Vec<Value> = rows
        .iter()
        .map(|r| {
            json!({
                "id": r.id,
                "slug": r.slug,
                "name": r.name,
                "description": r.description,
                "type": r.project_type,
                "status": r.status,
                "moderationNote": r.moderation_note,
                "createdAt": r.created_at.to_rfc3339(),

                "author": {
                    "username": r.author_username,
                    "avatarUrl": r.author_avatar_url,
                },
            })
        })
        .collect();

    Ok(Json(json!({
        "projects": result
    })))
}

#[derive(Deserialize)]
pub struct StatusBody {
    status: Option<String>,
    note: Option<String>,
}

pub async fn update_status(
    State(state): State<Arc<AppState>>,
    cookies: Cookies,
    Path(slug): Path<String>,
    Json(body): Json<StatusBody>,
) -> ApiResult<Json<Value>> {
    let user = require_user(
        &state.pool,
        &cookies,
    )
    .await?;

    if !user.is_staff() {
        return Err(ApiError::forbidden(
            "Staff only",
        ));
    }

    let status = body
        .status
        .filter(|s| {
            MODERATION_STATUSES.contains(&s.as_str())
        });

    let Some(status) = status else {
        return Err(ApiError::bad_request(format!(
            "status must be one of: {}",
            MODERATION_STATUSES.join(", ")
        )));
    };

    let note = if status == "approved" {
        None
    } else {
        body.note
            .map(|n| n.trim().to_string())
            .filter(|n| !n.is_empty())
    };

    let project: Option<ProjectDetailRow> =
        sqlx::query_as(
            "UPDATE projects
             SET
                status = $1::project_status,
                moderation_note = $2,
                updated_at = now()
             WHERE slug = $3
             RETURNING
                id,
                slug,
                name,
                description,
                readme,
                type::text as type,
                icon_url,
                header_url,
                tags,
                moderation_note,
                downloads,
                status::text as status,
                author_id,
                created_at,
                updated_at,
                ''::text as author_username,
                NULL::text as author_avatar_url,
                owner_org_id,
                NULL::text as owner_org_login,
                NULL::text as owner_org_avatar_url",
        )
        .bind(&status)
        .bind(&note)
        .bind(&slug)
        .fetch_optional(&state.pool)
        .await?;

    let Some(project) = project else {
        return Err(ApiError::not_found(
            "Project not found",
        ));
    };

    Ok(Json(json!({
        "project": {
            "id": project.id,
            "slug": project.slug,
            "name": project.name,
            "description": project.description,
            "readme": project.readme,
            "type": project.project_type,
            "authorId": project.author_id,
            "status": project.status,
            "downloads": project.downloads,
            "iconUrl": project.icon_url,
            "headerUrl": project.header_url,
            "tags": project.tags,
            "moderationNote": project.moderation_note,
            "createdAt": project.created_at.to_rfc3339(),
            "updatedAt": project.updated_at.to_rfc3339(),
        }
    })))
}

fn upload_url_to_relative_path(
    config: &crate::config::Config,
    url: &str,
) -> Option<String> {
    let prefix = format!(
        "{}/uploads/",
        config.api_url
    );

    url.strip_prefix(&prefix)
        .map(|s| s.to_string())
}

pub async fn delete_project(
    State(state): State<Arc<AppState>>,
    cookies: Cookies,
    Path(slug): Path<String>,
) -> ApiResult<Json<Value>> {
    let user = require_user(
        &state.pool,
        &cookies,
    )
    .await?;

    let project: Option<(
        Uuid,
        Uuid,
        Option<String>,
        Option<String>,
        Option<Uuid>,
    )> = sqlx::query_as(
        "SELECT
            id,
            author_id,
            icon_url,
            header_url,
            owner_org_id
         FROM projects
         WHERE slug = $1",
    )
    .bind(&slug)
    .fetch_optional(&state.pool)
    .await?;

    let Some((
        project_id,
        author_id,
        icon_url,
        header_url,
        owner_org_id,
    )) = project
    else {
        return Err(ApiError::not_found(
            "Project not found",
        ));
    };

    if !can_manage_project(&state.pool, &user, author_id, owner_org_id).await? {
        return Err(ApiError::forbidden(
            "Only the project author, an org member, or staff can delete this project",
        ));
    }

    let version_paths: Vec<(String,)> =
        sqlx::query_as(
            "SELECT file_path
             FROM project_versions
             WHERE project_id = $1",
        )
        .bind(project_id)
        .fetch_all(&state.pool)
        .await?;

    sqlx::query(
        "DELETE FROM projects
         WHERE id = $1",
    )
    .bind(project_id)
    .execute(&state.pool)
    .await?;

    for (path,) in version_paths {
        let absolute =
            crate::storage::resolve_upload_path(&path);

        if let Err(err) =
            tokio::fs::remove_file(&absolute).await
        {
            tracing::warn!(
                "failed to delete version file {path}: {err}"
            );
        }
    }

    for url in [icon_url, header_url]
        .into_iter()
        .flatten()
    {
        if let Some(relative) =
            upload_url_to_relative_path(
                &state.config,
                &url,
            )
        {
            let absolute =
                crate::storage::resolve_upload_path(
                    &relative,
                );

            if let Err(err) =
                tokio::fs::remove_file(&absolute).await
            {
                tracing::warn!(
                    "failed to delete image file {relative}: {err}"
                );
            }
        }
    }

    Ok(Json(json!({
        "success": true
    })))
}