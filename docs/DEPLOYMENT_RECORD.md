# Production Deployment Record

## Current Production Release

- Date verified: 2026-07-22
- Worker: `ghost-audience`
- Custom domain: `https://audience.grimnej.com`
- Retained Workers development URL: `https://ghost-audience.ginejneupane123.workers.dev`
- Cloudflare Worker version: `3cc22e46-b4a0-431a-8d79-77fd931a9807`
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
- An exact 5,000-word production project completed 10 ordered sections after resuming from a real provider-format failure and crossing the watsonx safety ceiling.
- The final three capacity-test requests returned HTTP 200 through automatic Workers AI continuity. Results contained 16 questions and 10 grounded understanding signals and survived a full reload.
- No DNS record was modified or deleted during the reliability deployment.
- GitHub Actions passed CI run `29654775644`, Security run `29654775634`, and Submission Gate run `29654775713` for release correction commit `beda893`.
- The hosted Submission Gate reached the preview Worker without Cloudflare credentials and passed the complete browser matrix using local fixture bindings.
- Reliability head `b6e9ef6` passed CI run `29904638974`, Security run `29904639008`, and Submission Gate run `29904638672` after the long-input fixes and audited dependency pins.

## Source Commits In This Release

- `6ee5cc7` - rebuild the audience analysis experience.
- `6fdd3d2` - keep live audience analysis moving.
- `aeda4e0` - harden the rebuilt creator journey.
- `cf80c00` - target the production Llama runtime.
- `7f23c55` - deliver a resilient AI audience read.
- `e4c74af` - record the verified production release.
- `beda893` - keep the hosted browser gate on local bindings.
- `d90035e` - make long audience reads collision safe.
- `76c75b4` - bound evidence in provider recovery.
- `37342d1` - continue reads past the primary model budget.
- `fe38eb0` - cover token budget continuity.
- `b6e9ef6` - patch audited transitive dependencies.
