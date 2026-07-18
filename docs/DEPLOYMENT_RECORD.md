# Production Deployment Record

## Current Production Release

- Date verified: 2026-07-18
- Worker: `ghost-audience`
- Custom domain: `https://audience.grimnej.com`
- Retained Workers development URL: `https://ghost-audience.ginejneupane123.workers.dev`
- Cloudflare Worker version: `2b4e4f8f-cfd7-4b7e-84e5-4081107333d0`
- Provider mode: live IBM watsonx.ai
- Model: `openai/gpt-oss-120b`
- D1 database: `ghost-audience-control`
- Remote migration: `0001_rate_limits.sql` applied

## Domain and Security

- `audience.grimnej.com` is configured as a Worker custom domain in the production `wrangler.jsonc` environment.
- Cloudflare manages the domain's Worker route and TLS certificate; no existing DNS record was modified or deleted during this release.
- Both the custom domain and retained Workers URL are permitted production origins during the transition.
- HTTPS returned HTTP 200 and the custom-origin API returned the expected CORS response.
- The CSP permits Cloudflare's managed Web Analytics beacon while retaining the app's restrictive source policy.

## Secret Handling

`WATSONX_API_KEY`, `WATSONX_PROJECT_ID`, `RATE_LIMIT_SALT`, and `SESSION_SIGNING_SECRET` are stored as Cloudflare Worker secrets. Their values are neither committed nor recorded here.

## Verification Completed

- Full repository quality gate passed: placeholder and request-key scans, Biome, TypeScript, dependency-boundary and dead-code checks, plus 46 unit tests.
- `GET /api/v1/health` and `GET /api/v1/capabilities` returned HTTP 200 over the custom domain.
- Capabilities reported the live watsonx.ai provider and `openai/gpt-oss-120b` catalog capability.
- A real browser completed all three fixture analysis steps over the custom domain; each request returned HTTP 200.
- A fresh real browser completed all three live watsonx.ai analysis steps over the custom domain; each request returned HTTP 200 and the run reached `completed`.
- The post-release browser console had no errors. The only warning was the automation context declining persistent-storage permission, which does not occur as an application error.

## Source Commits in This Release

- `62ae855` — normalize unambiguous watsonx evidence output.
- `67a17a9` — add the production custom-domain route.
- `3c2e850` — allow the Cloudflare analytics beacon under CSP.
