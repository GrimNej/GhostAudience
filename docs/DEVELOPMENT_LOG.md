# Development Log

## 2026-07-18: Bootstrap

- Created the `main` branch and committed the unmodified canonical blueprint extraction.
- Added a guarded extraction utility at `tools/repository/extract-blueprint.mjs`; it verifies the expected 195 canonical file sections and refuses paths outside the repository.
- Generated `pnpm-lock.yaml` from the pinned dependency graph.
- Recorded the first blueprint assembly correction in ADR 0001.

## 2026-07-18: Implementation Hardening

- Repaired the blueprint's missing TypeScript project files and corrected toolchain, dependency, test-discovery, accessibility, parser, contract, and Worker configuration defects. The rationale is recorded in ADR 0001.
- Added local D1 migration automation, deterministic fixture-browser coverage, recovery controls, cross-tab-safe resume behavior, and WCAG AA contrast corrections.
- Added the Python evaluation test suite, generated `tools/evaluation/uv.lock`, and verified its lint, type, and coverage gates.
- Verified the complete Playwright matrix: Chromium desktop, Firefox desktop, WebKit desktop, and mobile Chromium.
- Passed the full TypeScript coverage gate after adding targeted no-hindsight, persistence, and analysis-state branch coverage.

## 2026-07-18: Fixture Deployment

- Added the GitHub remote and pushed the complete `main` history to `GrimNej/GhostAudience`.
- Stored fresh rate-limit and session-signing values as Cloudflare Worker secrets, applying the remote D1 migration before deployment.
- Deployed and verified the fixture-mode Worker and its three-segment browser workflow. See `docs/DEPLOYMENT_RECORD.md` for the exact evidence.
- Corrected the GitHub Actions browser-install command to use Studio's Playwright package and upgraded workflow actions to Node 24 runtimes.

## 2026-07-18: Experience Rebuild

- Replaced the multi-page setup with one content composer where title and creator context are optional.
- Added TXT, Markdown, and Fountain import, automatic plain-prose segmentation, and a one-click analysis handoff.
- Consolidated questions, clarity risks, reaction journey, learned facts, exact evidence, intent review, and exports into one Results workspace.
- Rebuilt the responsive visual system and guided new-user, returning-user, progress, failure, and recovery states.
- Added a shared idempotent analysis controller and deterministic exact-quote fallback for model output that remains invalid after repair.
- Passed repository checks, production build, coverage thresholds, and the 16-test Chromium, Firefox, WebKit, and mobile browser matrix.
- Corrected the release command to target the production Wrangler environment and selected `meta-llama/llama-3-3-70b-instruct` for watsonx.ai.
- Rebuilt the product around one input and one audience read, then verified the owner's Iron Crag narrative against the live custom domain.
- Added a bounded Cloudflare Workers AI continuity path and evidence-backed fallback questions so provider delays or format drift cannot strand a report.
- Kept Cloudflare Vite preview bindings local for fixture-mode browser tests, removing the CI requirement for production Cloudflare credentials.
- Verified hosted CI, Security, and the 16-test Submission Gate as green for release correction commit `beda893`.

## 2026-07-18: Production Reliability And Product Contract

- Generalized the product from a script debugger to a first-audience simulator for speeches, stories, fiction, articles, pitches, scripts, and other substantial text.
- Rewrote the landing, composer, progress, project, and Results copy around the simple input-to-audience-read promise.
- Enabled native JSON output for the supported watsonx.ai Llama family and corrected route timeouts for bounded repair attempts.
- Added a Workers AI binding and Llama 3.1 8B Fast continuity path when IBM watsonx.ai is unavailable or too slow.
- Added strict structured-response salvage, exact-evidence repair, and content-aware question recovery so a completed read cannot collapse into an empty report.
- Verified the exact 504-word Iron Crag narrative on the public custom domain with two HTTP 200 section responses, 6 questions, 4 clarity risks, evidence details, and refresh persistence.
- Raised the Studio test count to 44 while retaining all coverage thresholds.

## Remaining Owner-Controlled Work

- Add genuine IBM Bob evidence only after it exists. The repository deliberately contains no fabricated Bob artifacts.
