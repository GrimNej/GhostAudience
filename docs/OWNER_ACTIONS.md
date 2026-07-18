# Owner Actions

## Current Status

The required owner setup is complete:

- GitHub repository: `https://github.com/GrimNej/GhostAudience.git`
- Cloudflare authentication: active through Wrangler
- Cloudflare zone: `grimnej.com`
- Custom domain: `audience.grimnej.com`
- D1 database: `ghost-audience-control`
- IBM watsonx.ai API key and project ID: stored as Worker secrets
- Cloudflare Workers AI continuity binding: deployed

Do not send credentials through chat or commit them to the repository.

## When Owner Action Is Needed Again

Owner action is required only if one of these changes:

1. Wrangler authentication expires. Run `pnpm exec wrangler login` from `apps/studio`.
2. The watsonx.ai API key is rotated. Run `pnpm exec wrangler secret put WATSONX_API_KEY --env production`.
3. The watsonx.ai project changes. Run `pnpm exec wrangler secret put WATSONX_PROJECT_ID --env production`.
4. A future automated deployment workflow needs a Cloudflare API token. Create a narrowly scoped token with Worker Scripts write, Worker Routes write, and D1 read access for this account, then store it as a GitHub Actions secret. Do not reuse a broad personal OAuth token.

No DNS action is currently required. Existing DNS records must remain untouched.
