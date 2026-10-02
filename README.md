# selaura-marketplace

## Deploying the web app to Cloudflare Workers

The Next.js app in `apps/web` deploys to `workers.dev` through `.github/workflows/deploy-web.yml`. The Rust API in `apps/server` cannot run on Workers and has to be hosted separately (anything that runs a container or binary and can reach Postgres, with a persistent disk for `uploads/`).

The Worker proxies `/api/v1/*` and `/uploads/*` to the API, so the browser only ever talks to one origin and the session cookie works normally.

1. Create a Cloudflare API token from the "Edit Cloudflare Workers" template and copy your account ID.
2. In the GitHub repo, add the secrets `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`.
3. Add the repository variable `API_URL` with the public address of the API, without a trailing slash or a port (for example `https://selaura-api.fly.dev`).
4. Push to `main`, or run the workflow by hand from the Actions tab. The first deploy prints the `https://selaura-marketplace.<your-subdomain>.workers.dev` address.
5. Point the API at that address: set `WEB_URL` and `API_URL` to the workers.dev address, and set the GitHub OAuth app's callback to `<workers.dev address>/api/v1/auth/github/callback`.

To change the Worker name, edit `name` in `apps/web/wrangler.jsonc`.

## Cloudflare preview deployment

The repository can deploy the Next.js frontend to a free Cloudflare Workers `workers.dev` URL.

Required GitHub Actions configuration:

- Secret `CLOUDFLARE_API_TOKEN`
- Secret `CLOUDFLARE_ACCOUNT_ID`
- Optional repository variable `API_URL`, pointing to an externally hosted Selaura API such as `https://api.example.com`

The workflow also builds `apps/server/Dockerfile` in CI, so the Rust API and its Docker setup remain part of the validated project.

### Important architecture note

Cloudflare Workers Free runs the frontend Worker; it does not run this Rust/Axum + PostgreSQL Docker container. The Rust API therefore needs its own host if the deployed preview is expected to load real projects, accounts, uploads, and database data. Without `API_URL`, the Worker can still deploy and static routes such as `/offline` can be previewed, but data-backed pages need an API.

For local full-stack development:

```bash
docker compose up --build
```

Set `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, and `SESSION_SECRET` in the environment before starting the stack.
