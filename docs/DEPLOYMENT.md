# Production Deployment Prerequisites

Local fixture mode is complete. Production deployment is intentionally blocked until the project owner provides real account access and configuration.

## Owner actions required

1. Log in to Cloudflare and create a D1 database for the `CONTROL_DB` binding.
2. Replace `REPLACE_WITH_D1_DATABASE_ID` in `apps/studio/wrangler.jsonc` with that database's immutable ID.
3. Decide the public origin. A Cloudflare Workers URL is sufficient initially; a custom domain is optional.
4. Create or select an IBM Cloud watsonx.ai project with access to an available Granite model, then provide its project ID and API key.
5. Confirm the exact production model ID available to that watsonx.ai project before replacing `WATSONX_MODEL_ID`.

## Secrets to set after access is available

From `apps/studio`, set all secrets against the production environment. Generate fresh, unique values for both local application secrets; do not reuse the fixture values.

```powershell
pnpm exec wrangler secret put WATSONX_API_KEY --env production
pnpm exec wrangler secret put WATSONX_PROJECT_ID --env production
pnpm exec wrangler secret put RATE_LIMIT_SALT --env production
pnpm exec wrangler secret put SESSION_SIGNING_SECRET --env production
```

Update `ALLOWED_ORIGINS` in the production section of `apps/studio/wrangler.jsonc` to the exact deployed HTTPS origin. Then apply the D1 migration remotely and deploy:

```powershell
pnpm exec wrangler d1 migrations apply CONTROL_DB --env production
pnpm deploy
```

## Required post-deploy checks

- Verify `/api/v1/health` and `/api/v1/capabilities` over the deployed HTTPS origin.
- Run the security-header and fixture smoke checks against that origin.
- Test a live Granite analysis with non-sensitive sample text, then inspect Worker logs to confirm no script content or credentials are logged.
- Keep fixture mode available as a transparent demonstration fallback.

Do not claim production deployment, watsonx.ai validation, IBM Bob use, certificates, or challenge eligibility until those owner-controlled steps have actually happened.
