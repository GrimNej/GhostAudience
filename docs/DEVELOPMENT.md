# Development Guide

## Prerequisites

- Node.js 24.18.0 and pnpm 11.14.0.
- `uv` with Python 3.13 for `tools/evaluation`.
- No cloud credentials are required for fixture-mode development.

## First run

```powershell
pnpm install --frozen-lockfile
pnpm --filter @ghost-audience/studio db:migrate:local
pnpm dev
```

The default Worker configuration is deliberately local-only: it uses fixture analysis, a local D1 database, and localhost origins. It must not be deployed as production configuration.

## Verification commands

```powershell
pnpm check:fixtures
pnpm check
pnpm build
pnpm test:e2e
```

Python evaluation checks run independently:

```powershell
Set-Location tools/evaluation
uv sync --frozen
uv run ruff check .
uv run ruff format --check .
uv run mypy .
uv run pytest
```

## Working conventions

- Keep implementation changes small and commit them by concern.
- Do not add secrets, raw model logs, creator scripts, certificates, or challenge evidence to Git.
- Record architecture changes in `docs/DECISIONS/` and update `docs/PROJECT_STATUS.md` and `docs/DEVELOPMENT_LOG.md` when milestones change.
- Use fixture mode for deterministic development. Live-model output is nondeterministic and requires production credentials.
