use serde::Deserialize;

use crate::config::Config;

#[derive(Debug, Deserialize)]
pub struct GitHubUser {
    pub id: u64,
    pub login: String,
    pub avatar_url: String,
}

#[derive(Debug, Deserialize)]
pub struct GitHubOrg {
    pub id: u64,
    pub login: String,
    pub avatar_url: String,
    pub description: Option<String>,
}

#[derive(Debug, Deserialize)]
struct GitHubEmail {
    email: String,
    primary: bool,
    verified: bool,
}

#[derive(Debug, Deserialize)]
struct TokenResponse {
    access_token: Option<String>,
    error: Option<String>,
}

pub async fn exchange_code(config: &Config, code: &str) -> Result<String, String> {
    let client = reqwest::Client::new();

    let response = client
        .post("https://github.com/login/oauth/access_token")
        .header("Accept", "application/json")
        .json(&serde_json::json!({
            "client_id": config.github_client_id,
            "client_secret": config.github_client_secret,
            "code": code,
        }))
        .send()
        .await
        .map_err(|_| "Failed to exchange GitHub OAuth code".to_string())?;

    if !response.status().is_success() {
        return Err("Failed to exchange GitHub OAuth code".to_string());
    }

    let data: TokenResponse = response
        .json()
        .await
        .map_err(|_| "Failed to exchange GitHub OAuth code".to_string())?;

    data.access_token
        .ok_or_else(|| data.error.unwrap_or_else(|| "GitHub did not return an access token".to_string()))
}

pub async fn get_github_user(access_token: &str) -> Result<GitHubUser, String> {
    let client = reqwest::Client::new();

    let response = client
        .get("https://api.github.com/user")
        .header("Authorization", format!("Bearer {access_token}"))
        .header("Accept", "application/vnd.github+json")
        .header("X-GitHub-Api-Version", "2022-11-28")
        .header("User-Agent", "selaura-api")
        .send()
        .await
        .map_err(|_| "Failed to fetch GitHub user".to_string())?;

    if !response.status().is_success() {
        return Err("Failed to fetch GitHub user".to_string());
    }

    response
        .json()
        .await
        .map_err(|_| "Failed to fetch GitHub user".to_string())
}

pub async fn get_github_email(access_token: &str) -> Option<String> {
    let client = reqwest::Client::new();

    let response = client
        .get("https://api.github.com/user/emails")
        .header("Authorization", format!("Bearer {access_token}"))
        .header("Accept", "application/vnd.github+json")
        .header("X-GitHub-Api-Version", "2022-11-28")
        .header("User-Agent", "selaura-api")
        .send()
        .await
        .ok()?;

    if !response.status().is_success() {
        return None;
    }

    let emails: Vec<GitHubEmail> = response.json().await.ok()?;

    emails
        .into_iter()
        .find(|e| e.primary && e.verified)
        .map(|e| e.email)
}

pub async fn get_github_orgs(access_token: &str) -> Vec<GitHubOrg> {
    let client = reqwest::Client::new();

    let response = match client
        .get("https://api.github.com/user/orgs")
        .header("Authorization", format!("Bearer {access_token}"))
        .header("Accept", "application/vnd.github+json")
        .header("X-GitHub-Api-Version", "2022-11-28")
        .header("User-Agent", "selaura-api")
        .send()
        .await
    {
        Ok(response) => response,
        Err(_) => return Vec::new(),
    };

    if !response.status().is_success() {
        return Vec::new();
    }

    response.json().await.unwrap_or_default()
}
