# Verification Record

## Verified locally on 2026-07-18

- `pnpm check:fixtures`
- `pnpm check` — placeholder, no-hindsight, lint, TypeScript, boundaries, dead-code, and unit-test gates.
- `pnpm test:coverage` — Studio exceeds its configured 85% statements/functions/lines and 80% branch thresholds.
- `pnpm build`
- `pnpm test:e2e` — 16 passing tests across Chromium desktop, Firefox desktop, WebKit desktop, and mobile Chromium.
- `uv run ruff check .`, `uv run ruff format --check .`, `uv run mypy .`, and `uv run pytest` from `tools/evaluation` — 5 tests and 97% coverage.

## Test-environment rule

Playwright blocks service-worker registration so cross-browser browser contexts remain isolated and deterministic. The production build still contains the PWA registration and generated Workbox service worker; PWA behavior is not disabled in the application.

## Toolchain caveat

The JavaScript checks ran under Node.js 24.14.0 rather than the repository's pinned Node.js 24.18.0. The Python checks ran through `uv` on CPython 3.13.13; CI pins 3.13.14. The GitHub Actions workflow is the final pinned-toolchain release gate.
