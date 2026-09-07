use std::env;

#[derive(Clone, Debug)]
pub struct Config {
    pub port: u16,
    pub host: String,

    pub web_url: String,
    pub api_url: String,

    pub database_url: String,

    pub github_client_id: String,
    pub github_client_secret: String,

    pub session_secret: String,

    pub admin_github_id: Option<String>,
}

impl Config {
    pub fn from_env() -> Self {
        Config {
            port: env::var("PORT")
                .ok()
                .and_then(|v| v.parse().ok())
                .unwrap_or(3001),

            host: env::var("HOST").unwrap_or_else(|_| "127.0.0.1".to_string()),

            web_url: env::var("WEB_URL").unwrap_or_else(|_| "http://localhost:3000".to_string()),

            api_url: env::var("API_URL").unwrap_or_else(|_| "http://localhost:3001".to_string()),

            database_url: env::var("DATABASE_URL")
                .expect("DATABASE_URL must be set"),

            github_client_id: env::var("GITHUB_CLIENT_ID")
                .expect("GITHUB_CLIENT_ID must be set"),

            github_client_secret: env::var("GITHUB_CLIENT_SECRET")
                .expect("GITHUB_CLIENT_SECRET must be set"),

            session_secret: env::var("SESSION_SECRET")
                .expect("SESSION_SECRET must be set"),

            admin_github_id: env::var("ADMIN_GITHUB_ID").ok(),
        }
    }
}
