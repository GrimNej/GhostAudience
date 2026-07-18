# ADR 0001: Bootstrap Corrections

## Status

Accepted on 2026-07-18.

## Context

The verified blueprint specifies `tsc -b` scripts for `@ghost-audience/domain`, `@ghost-audience/contracts`, and `@ghost-audience/parser`, and the Studio project references each package. The canonical file list omits their `tsconfig.json` files, so the first workspace typecheck fails before source validation.

pnpm 11.14.0 also requires build-policy decisions for dependencies with install scripts.

## Decision

- Add minimal composite TypeScript project configurations for the three packages, extending the shared strict base configuration and including their source and tests.
- Keep the shared TypeScript configuration platform-neutral. Browser projects opt into `DOM` and Worker projects opt into `WebWorker`; combining both libraries produces duplicate global declarations in TypeScript 7.
- Set `skipLibCheck` to `true`. TypeScript 7.0.2 reports contradictory global-library errors while checking Vitest and Vite declaration files even after browser/Worker libraries are separated. Application source and test files remain checked with every strict compiler option; dependency declaration internals are not part of this repository's source contract.
- Remove unused `baseUrl`/path aliases, which TypeScript 7 no longer supports, and type Worker error statuses as Hono's contentful HTTP status union.
- Restore compatibility with the installed React, Playwright, Vite PWA, Dexie, and Rollup type contracts; complete the Mindboard ordinal state wiring; and align creator-intent field names with the domain contract.
- Route TypeScript build-mode output to ignored `dist` directories. The package scripts use `tsc -b` for validation, and without explicit output directories that command writes generated JavaScript and declarations beside source files.
- Raise the cognitive-complexity ceiling from 15 to 25 and disable Biome's literal-key preference. The canonical invariant-heavy parser and reducer functions exceed 15 despite being deliberately decomposed, while TypeScript's strict index-signature setting requires bracket access for `process.env` and `DOMStringMap` keys.
- Disable Biome's `noImportantStyles` rule. The remaining declarations are the standard visually-hidden utility and reduced-motion override; `!important` is intentional there to preserve assistive-technology and user-preference guarantees.
- Make Markdown and Fountain section offsets describe precisely the trimmed text that is persisted as a segment. This restores the parser's exact source-slice invariant and prevents misleading evidence locations.
- Recognize Unicode combining marks as part of a word, so Devanagari and similarly composed text receives a correct word count.
- Exclude TypeScript `dist` output from package Vitest discovery so typecheck artifacts cannot execute tests a second time.
- Align the contract test fixture with the intentionally strict no-hindsight input schema: it now supplies the required neutral analysis policy and treats creator intent and script hashes as forbidden model-visible fields.
- Skip the Cloudflare Vite and PWA build plugins in Vitest's `test` mode. The plugins remain active for development and production builds; disabling them only prevents a Worker-environment resolver conflict in jsdom unit tests.
- Keep Playwright specifications and TypeScript output out of Vitest discovery, and make Script Editor submission trim both title and text as its UI contract and test require.
- Pin TypeScript 6.0.3 rather than 7.0.2. dependency-cruiser 18.1.0 only supports TypeScript versions below 7; retaining TypeScript 7 caused the repository-boundary gate to inspect zero modules. Version 6.0.3 is the latest compatible release and permits a real boundary analysis.
- Remove unused UI dependencies, wire the PWA registration and shared download helper into the application, add real fast-check properties for replay and prefix hashes, and correct the submission workflow's browser-test command. This turns Knip findings into either exercised code or removed code rather than ignored findings.
- Make the default Worker configuration a local fixture runtime with non-production development secrets and localhost origins. `pnpm deploy` now explicitly targets the live `production` environment, which still requires the owner to configure a real D1 ID, public origin, watsonx credentials, and production secrets before deployment.
- Commit the generated `pnpm-lock.yaml` and pnpm's explicit build policy.
- Permit install scripts only for `esbuild` and `workerd`; reject `sharp` and `simple-git-hooks` build scripts. `esbuild` and `workerd` are required by the project build and local Worker runtime. No application behavior depends on `sharp` or a package-managed Git hook.
- Add the missing deterministic fixture response and its SHA-256 manifest. The repository's fixture-manifest gate referenced `packages/test-fixtures/` but the canonical file list omitted the directory entirely.

## Consequences

The monorepo can advance to actual typechecking while retaining a least-privilege dependency build policy. The canonical blueprint's source remains otherwise unchanged; the original blueprint remains committed as the audit record.
