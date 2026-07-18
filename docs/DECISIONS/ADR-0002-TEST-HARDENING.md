# ADR 0002: Local Runtime and Browser-Test Hardening

## Status

Accepted on 2026-07-18.

## Context

The canonical browser test suite assumed an obsolete fixture button label and a completed run could not be resumed from the interface. Browser tests also started a preview Worker without applying its local D1 migration. In Firefox and WebKit, a registered service worker persisted between automation navigations and made reload checks nondeterministic across isolated browser contexts.

The Python evaluation project had a 90% coverage gate but supplied no tests or lockfile, making its CI job fail immediately.

## Decision

- Add a visible `Resume analysis` action for non-terminal runs. Resumption reloads the immutable script and persisted prefix chain, records `RUN_RESUMED`, and reuses the existing fenced lock and idempotent step repository.
- Treat an active lock in another tab as a non-destructive condition; record the blocked attempt without changing the shared run to `failed`.
- Apply local D1 migrations before Playwright's preview server begins and constrain the smoke script to the Chromium project used by CI.
- Block service-worker registration only in Playwright contexts. The production bundle continues to register its PWA service worker.
- Add the Python test suite and `uv.lock`, and align the strict Ruff configuration with the evaluation utility's practical project conventions.

## Consequences

Interrupted runs have a user-facing recovery path, browser tests exercise a real local Worker and D1 schema, and all configured browser engines pass the same deterministic fixture matrix. The Python quality gate is now executable and covered. Production PWA behavior and real cloud deployment still require owner-controlled verification.
