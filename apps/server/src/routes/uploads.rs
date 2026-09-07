use axum::Json;
use serde_json::{json, Value};

pub async fn uploads_test() -> Json<Value> {
    Json(json!({
        "status": "ok",
        "message": "Upload routes are working",
    }))
}
