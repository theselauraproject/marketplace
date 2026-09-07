use axum::Json;
use serde_json::json;

use crate::metadata::{
    GAME_VERSIONS, PROJECT_ENVIRONMENTS, PROJECT_LOADERS, PROJECT_TYPES,
    RESOURCE_PACK_RESOLUTIONS,
};

pub async fn get_metadata() -> Json<serde_json::Value> {
    let types: Vec<_> = PROJECT_TYPES
        .iter()
        .map(|(value, label)| json!({ "value": value, "label": label }))
        .collect();

    let loaders: Vec<_> = PROJECT_LOADERS
        .iter()
        .map(|(value, label)| json!({ "value": value, "label": label }))
        .collect();

    let environments: Vec<_> = PROJECT_ENVIRONMENTS
        .iter()
        .map(|(value, label)| json!({ "value": value, "label": label }))
        .collect();

    let game_versions: Vec<_> = GAME_VERSIONS.to_vec();
    let resolutions: Vec<_> = RESOURCE_PACK_RESOLUTIONS.to_vec();

    Json(json!({
        "types": types,
        "gameVersions": game_versions,
        "loaders": loaders,
        "environments": environments,
        "resolutions": resolutions,
    }))
}
