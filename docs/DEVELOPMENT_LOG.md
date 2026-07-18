# Development Log

## 2026-07-18 — Bootstrap

- Created the `main` branch and committed the unmodified canonical blueprint extraction.
- Added a guarded extraction utility at `tools/repository/extract-blueprint.mjs`; it verifies the expected 195 canonical file sections and refuses paths outside the repository.
- Generated `pnpm-lock.yaml` from the pinned dependency graph.
- Recorded the first blueprint assembly correction in ADR 0001.

Future entries will state what changed, how it was verified, and any remaining external dependency.

## 2026-07-18 â€” Implementation hardening

- Repaired the blueprint's missing TypeScript project files and corrected toolchain, dependency, test-discovery, accessibility, parser, contract, and Worker configuration defects. The rationale is recorded in ADR 0001.
- Added local D1 migration automation, deterministic fixture-browser coverage, recovery controls, cross-tab-safe resume behavior, and WCAG AA contrast corrections.
- Added the Python evaluation test suite, generated `tools/evaluation/uv.lock`, and verified its lint, type, and coverage gates.
- Verified the complete Playwright matrix: Chromium desktop, Firefox desktop, WebKit desktop, and mobile Chromium.
- Passed the full TypeScript coverage gate after adding targeted no-hindsight, persistence, and analysis-state branch coverage.

## Remaining owner-controlled work

- Configure IBM watsonx.ai and Cloudflare production resources, then deploy and rerun the deployed-origin smoke checks.
- Add genuine IBM Bob evidence only after it exists. The repository deliberately contains no fabricated Bob artifacts.
