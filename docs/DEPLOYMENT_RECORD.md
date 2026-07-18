# Production Deployment Record

## Current Production Release

- Date verified: 2026-07-18
- Worker: `ghost-audience`
- Custom domain: `https://audience.grimnej.com`
- Retained Workers development URL: `https://ghost-audience.ginejneupane123.workers.dev`
- Cloudflare Worker version: `76151317-610d-452b-a3b2-3e5bfae3cc4b`
- Provider mode: live with automatic continuity
- Primary model: IBM watsonx.ai `meta-llama/llama-3-3-70b-instruct`
- Continuity model: Cloudflare Workers AI `@cf/meta/llama-3.1-8b-instruct-fast`
- D1 database: `ghost-audience-control`
- Remote migration: `0001_rate_limits.sql` applied

## Domain And Security

- `audience.grimnej.com` is configured as a Worker custom domain in the production `wrangler.jsonc` environment.
- Cloudflare manages the domain's Worker route and TLS certificate. No existing DNS record was modified or deleted during this release.
- Both the custom domain and retained Workers URL are permitted production origins.
- HTTPS returned HTTP 200 and the custom-origin API returned the expected CORS response.
- The CSP permits Cloudflare's managed Web Analytics beacon while retaining the app's restrictive source policy.

## Secret Handling

`WATSONX_API_KEY`, `WATSONX_PROJECT_ID`, `RATE_LIMIT_SALT`, and `SESSION_SIGNING_SECRET` are stored as Cloudflare Worker secrets. Their values are neither committed nor recorded here. Workers AI is attached through the non-secret `AI` binding.

## Verification Completed

- Full repository quality gate passed: placeholder and request-key scans, Biome, TypeScript, dependency-boundary and dead-code checks, plus 72 TypeScript unit and integration tests.
- Studio coverage passed at 90.95% statements, 80.21% branches, 90.41% functions, and 94.17% lines.
- The 16-test browser matrix passed across Chromium, Firefox, WebKit, and mobile Chromium, including automated accessibility checks.
- `GET /api/v1/health` and `GET /api/v1/capabilities` returned HTTP 200 over the custom domain.
- Capabilities reported the live watsonx.ai provider and `meta-llama/llama-3-3-70b-instruct` catalog capability.
- A fresh browser imported the owner's exact 504-word Iron Crag narrative, completed both live sections with HTTP 200 responses, and opened Results automatically.
- The verified report contained 6 questions, 4 clarity risks, 2 clear signals, exact evidence, working question details, and refresh persistence.
- The post-release browser console had no application errors. The only warning was the automation context declining persistent-storage permission.

## Source Commits In This Release

- `6ee5cc7` - rebuild the audience analysis experience.
- `6fdd3d2` - keep live audience analysis moving.
- `aeda4e0` - harden the rebuilt creator journey.
- `cf80c00` - target the production Llama runtime.
- `7f23c55` - deliver a resilient AI audience read.
