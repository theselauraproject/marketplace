use crate::error::{ApiError, ApiResult};

pub const MAX_BIO_LENGTH: usize = 280;
pub const MAX_URL_LENGTH: usize = 300;

pub fn clean_text(value: Option<String>, max_len: usize) -> Option<String> {
    value
        .map(|v| v.trim().chars().take(max_len).collect::<String>())
        .filter(|v| !v.is_empty())
}

pub fn clean_url(value: Option<String>) -> ApiResult<Option<String>> {
    let Some(raw) = value else {
        return Ok(None);
    };

    let trimmed = raw.trim();

    if trimmed.is_empty() {
        return Ok(None);
    }

    if trimmed.chars().count() > MAX_URL_LENGTH {
        return Err(ApiError::bad_request("Link is too long"));
    }

    if !(trimmed.starts_with("http://") || trimmed.starts_with("https://")) {
        return Err(ApiError::bad_request(
            "Links must start with http:// or https://",
        ));
    }

    Ok(Some(trimmed.to_string()))
}
