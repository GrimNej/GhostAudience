# Production Deployment Prerequisites

Local fixture mode is complete. The exact repository and Cloudflare account handoff is in `docs/OWNER_ACTIONS.md`.

## Owner actions required

1. Log in to Cloudflare and create or confirm a D1 database for the `CONTROL_DB` binding.
2. Set the production D1 database ID in `apps/studio/wrangler.jsonc`.
3. Decide the public origin. A Cloudflare Workers URL is sufficient initially; a custom domain is optional.
4. For a later live-model release, create or select an IBM Cloud watsonx.ai project with access to an available Granite model, then confirm its project ID and model ID.

## Secrets to set after access is available

From `apps/studio`, set the two application secrets against the production environment. Generate fresh, unique values; do not reuse local fixture values.

```powershell
pnpm exec wrangler secret put RATE_LIMIT_SALT --env production
pnpm exec wrangler secret put SESSION_SIGNING_SECRET --env production
```

When changing `PROVIDER_MODE` from `fixture` to `live`, also set `WATSONX_API_KEY` and `WATSONX_PROJECT_ID` as production secrets and confirm the configured Granite model is available to that watsonx.ai project.

Update `ALLOWED_ORIGINS` in the production section of `apps/studio/wrangler.jsonc` to the exact deployed HTTPS origin. The app's tracked `.env.production` selects the production Cloudflare environment during the Vite build; do not add `--env production` to the deployment command. Then apply the D1 migration remotely and deploy:

```powershell
pnpm exec wrangler d1 migrations apply CONTROL_DB --env production --remote
pnpm deploy
```

## Required post-deploy checks

- Verify `/api/v1/health` and `/api/v1/capabilities` over the deployed HTTPS origin.
- Run the security-header and fixture smoke checks against that origin.
- Test a live Granite analysis with non-sensitive sample text, then inspect Worker logs to confirm no script content or credentials are logged.
- Keep fixture mode available as a transparent demonstration fallback.

Do not claim production deployment, watsonx.ai validation, IBM Bob use, certificates, or challenge eligibility until those owner-controlled steps have actually happened.
