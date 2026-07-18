# Owner Actions Required To Publish Ghost Audience

## 1. Create The GitHub Repository

1. Go to `https://github.com/new` while signed into the account or organization that should own the project.
2. Set the repository name to `GhostAudience` (or another name you prefer).
3. Choose the intended visibility.
4. **Do not** initialize it with a README, `.gitignore`, or license: this local repository already has its history.
5. Click **Create repository**.
6. Send Codex the repository's HTTPS or SSH URL. Codex will add it as `origin` and push `main`.

## 2. Authenticate Cloudflare Locally

From `apps/studio`, run:

```powershell
pnpm exec wrangler login
```

Complete the browser authorization, return to this project, and tell Codex that it succeeded. Do not send tokens or passwords in chat.

## 3. Confirm The D1 Database

The provided D1 database ID, `699bb1dd-1466-457f-8f6e-849d3558475e`, is now configured for the production environment as `ghost-audience-control`.

Only respond if that database is *not* the intended production database. Otherwise Codex can apply the migration once Cloudflare login is complete.

## 4. Production Deployment Sequence Codex Will Perform

After steps 1 and 2, Codex will:

1. Generate and store the two Worker secrets without exposing them in Git.
2. Apply `migrations/0001_rate_limits.sql` to the configured remote D1 database.
3. Deploy the validated fixture-mode Worker at `https://ghost-audience-production.ginejneupane123.workers.dev`.
4. Verify health, capability, security-header, and browser smoke endpoints.
5. Commit and push the final deployment configuration and verification record.

## 5. IBM watsonx.ai Is Not Needed Yet

The first deployment deliberately uses deterministic fixture mode, so it is usable without an IBM credential. Later, to turn on live model analysis, provide access to a watsonx.ai project and confirm its available Granite model. Never send the API key through chat; Codex will use Cloudflare's secret command after access is available.
