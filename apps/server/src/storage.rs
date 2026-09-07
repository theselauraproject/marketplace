use std::path::{Path, PathBuf};

use tokio::fs;
use uuid::Uuid;

use crate::config::Config;

pub struct StoredFile {
    pub file_name: String,
    pub file_path: String,
    pub url: String,
    pub size: i32,
}

pub fn upload_root() -> PathBuf {
    std::env::current_dir()
        .expect("failed to read current dir")
        .join("uploads")
}

pub fn resolve_upload_path(relative_path: &str) -> PathBuf {
    upload_root().join(relative_path)
}

pub async fn save_uploaded_file(
    config: &Config,
    bytes: &[u8],
    original_name: &str,
    subdir: &str,
) -> std::io::Result<StoredFile> {
    let extension = Path::new(original_name)
        .extension()
        .map(|e| format!(".{}", e.to_string_lossy()))
        .unwrap_or_default();

    let extension: String = extension.chars().take(10).collect();

    let generated_name = format!("{}{}", Uuid::new_v4(), extension);

    let dir = upload_root().join(subdir);
    fs::create_dir_all(&dir).await?;

    let absolute_path = dir.join(&generated_name);
    fs::write(&absolute_path, bytes).await?;

    let relative_path = format!("{subdir}/{generated_name}");

    Ok(StoredFile {
        file_name: original_name.to_string(),
        file_path: relative_path.clone(),
        url: format!("{}/uploads/{}", config.api_url, relative_path),
        size: bytes.len() as i32,
    })
}
