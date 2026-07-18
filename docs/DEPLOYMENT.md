# Production Deployment

The production Worker is configured in the `production` environment of `apps/studio/wrangler.jsonc`. Its custom domain is `audience.grimnej.com`. Do not modify or delete unrelated DNS records when releasing the application.

The Worker has an `AI` binding for the automatic continuity model. This binding has no secret value and is deployed from Wrangler configuration.

## Required Cloudflare Secrets

The following secrets must exist on the `ghost-audience` Worker:

```powershell
pnpm --filter @ghost-audience/studio exec wrangler secret put RATE_LIMIT_SALT --env production
pnpm --filter @ghost-audience/studio exec wrangler secret put SESSION_SIGNING_SECRET --env production
pnpm --filter @ghost-audience/studio exec wrangler secret put WATSONX_API_KEY --env production
pnpm --filter @ghost-audience/studio exec wrangler secret put WATSONX_PROJECT_ID --env production
```

Never commit, print, or paste secret values into repository files or command arguments.

## Release Commands

Authenticate with Wrangler, apply any pending D1 migrations, validate the upload, and deploy:

```powershell
pnpm --filter @ghost-audience/studio exec wrangler whoami
pnpm --filter @ghost-audience/studio exec wrangler d1 migrations apply CONTROL_DB --env production --remote
pnpm --filter @ghost-audience/studio build:production
pnpm --filter @ghost-audience/studio exec wrangler deploy --env production --dry-run
pnpm deploy
```

`pnpm deploy` builds in `cloudflare-production` mode and explicitly deploys the production Wrangler environment. The custom domain declaration is applied without changing unrelated zone records.

## Required Post-Deploy Checks

- Verify `/api/v1/health` and `/api/v1/capabilities` over the deployed HTTPS origin.
- Confirm capabilities report live watsonx.ai and the configured primary model.
- Run the security-header and browser smoke checks against the custom domain.
- Test a live analysis with non-sensitive sample text and confirm every section commits.
- Check the browser console and Worker logs for application errors without recording script content or credentials.
- Confirm a primary timeout continues through the Workers AI binding rather than failing the creator's run.
- Keep fixture mode available as a transparent local demonstration mode.

Do not claim a production release or model verification until these checks have actually passed.
