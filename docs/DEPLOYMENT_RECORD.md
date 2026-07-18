# Fixture Production Deployment Record

## Deployment

- Date: 2026-07-18
- Worker: `ghost-audience-production`
- Public URL: `https://ghost-audience-production.ginejneupane123.workers.dev`
- Cloudflare Version ID: `04ac5195-6895-4195-b922-2dd8f69bd589`
- Provider mode: deterministic fixture mode
- D1 database: `ghost-audience-control`
- Remote migration: `0001_rate_limits.sql` applied successfully

## Secret Handling

Fresh production values for `RATE_LIMIT_SALT` and `SESSION_SIGNING_SECRET` were stored as Cloudflare Worker secrets. Their values are neither committed nor recorded in this repository.

## Deployed Verification

- `GET /api/v1/health` returned HTTP 200 with `status: "ok"`.
- `GET /api/v1/capabilities` returned HTTP 200 with the fixture provider, fixture fallback enabled, and a zero-use token budget.
- A request from the exact deployed origin received the expected CORS response.
- API responses included no-store cache control, `nosniff`, referrer, permissions, and cross-origin isolation headers.
- A real-browser smoke flow created the demo project and completed all three sequential analysis segments without hindsight data or browser errors.

## Follow-Up

- Rerun the GitHub Actions **Submission gate** workflow after commit `90b5c9e`; it now installs the Studio-owned Playwright version and uses Node 24 action runtimes.
- A live IBM watsonx.ai integration remains intentionally disabled until a watsonx.ai project and model are confirmed. See `docs/DEPLOYMENT.md`.
