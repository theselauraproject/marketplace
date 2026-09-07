mod config;
mod current_user;
mod db;
mod error;
mod github;
mod metadata;
mod models;
mod routes;
mod session;
mod storage;

use std::sync::Arc;

use axum::{
    http::{HeaderValue, Method},
    routing::{get, patch, post},
    Router,
};
use sqlx::PgPool;
use tower_cookies::CookieManagerLayer;
use tower_http::{
    cors::{AllowHeaders, CorsLayer},
    services::ServeDir,
    trace::TraceLayer,
};

use config::Config;

pub struct AppState {
    pub pool: PgPool,
    pub config: Config,
}

#[tokio::main]
async fn main() {
    dotenvy::dotenv().ok();

    tracing_subscriber::fmt()
        .with_env_filter(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "info".into()),
        )
        .init();

    let config = Config::from_env();
    let pool = db::create_pool(&config.database_url).await;

    sqlx::migrate::Migrator::new(std::path::Path::new("./migrations"))
        .await
        .expect("Failed to load migrations")
        .run(&pool)
        .await
        .expect("Failed to run database migrations");

    let web_url = config.web_url.clone();
    let host = config.host.clone();
    let port = config.port;

    let state = Arc::new(AppState { pool, config });

    let cors = CorsLayer::new()
        .allow_origin(
            web_url
                .parse::<HeaderValue>()
                .expect("WEB_URL must be a valid origin"),
        )
        .allow_credentials(true)
        .allow_methods([
            Method::GET,
            Method::POST,
            Method::PATCH,
            Method::DELETE,
            Method::OPTIONS,
        ])

        .allow_headers(AllowHeaders::mirror_request());

    let api_v1 = Router::new()
        .route("/health", get(routes::health::health))
        .route("/metadata", get(routes::metadata::get_metadata))
        .route("/auth/github", get(routes::auth::github_login))
        .route("/auth/github/link", get(routes::auth::github_link))
        .route("/auth/github/callback", get(routes::auth::github_callback))
        .route("/auth/me", get(routes::auth::me))
        .route("/auth/logout", post(routes::auth::logout))
        .route("/auth/accounts", get(routes::auth::list_accounts))
        .route("/auth/switch", post(routes::auth::switch_account))
        .route("/projects", get(routes::projects::list_projects).post(routes::projects::create_project))
        .route("/projects/search", get(routes::projects::search_projects))
        .route("/projects/moderation/queue", get(routes::projects::moderation_queue))
        .route("/projects/:slug", get(routes::projects::get_project).delete(routes::projects::delete_project))
        .route("/projects/:slug/status", patch(routes::projects::update_status))
        .route("/projects/:slug/versions", post(routes::projects::create_version))
        .route("/versions/:id/download", get(routes::projects::download_version))
        .route("/uploads/test", get(routes::uploads::uploads_test));

    let app = Router::new()
        .nest("/api/v1", api_v1)
        .nest_service("/uploads", ServeDir::new("uploads"))
        .layer(CookieManagerLayer::new())
        .layer(cors)
        .layer(TraceLayer::new_for_http())
        .with_state(state);

    let addr = format!("{host}:{port}");
    tracing::info!("Selaura API listening on http://{addr}");

    let listener = tokio::net::TcpListener::bind(&addr)
        .await
        .expect("failed to bind address");

    axum::serve(listener, app).await.expect("server error");
}
