# Ghost Audience

**Meet your audience before they exist.**

Ghost Audience is a no-hindsight narrative debugger for storytellers and content creators. It reads a script sequentially, reconstructs what a plausible first-time audience could know at each moment, generates evidence-grounded questions, and tracks each question from opening to resolution.

## The problem

Creators know their entire story, while an audience experiences it one moment at a time. That knowledge gap makes accidental ambiguity, missing motivation, unclear references, abandoned questions, and late explanations difficult for a creator to notice.

Many AI script-review tools read the entire script before criticizing its opening. That gives the model hindsight and can hide genuine first-time audience confusion.

## The solution

Ghost Audience processes one immutable script segment at a time. For segment `N`, the neutral analysis request contains only:

- accepted audience state through segment `N - 1`;
- the current segment;
- active audience questions;
- a non-semantic analysis policy.

Future segments and creator-supplied future intent are structurally absent. Every accepted finding must cite exact source evidence. The creator remains in control by marking each finding as intended, acceptable, accidental, or an incorrect AI interpretation.

## Selected challenge theme

**July Challenge — Reimagine Creative Industries with AI**

Ghost Audience directly supports storytelling and content creation. It helps writers, filmmakers, video essayists, game-narrative designers, educators, and other creators understand how their work unfolds for a first-time audience before publication.

## Why it matters

Human test readers remain essential, but they often arrive late and can be expensive or slow to coordinate. Ghost Audience provides an immediate pre-reader that exposes plausible questions without claiming to replace real audiences or creative judgment.

## AI and technical approach

- **IBM Bob:** primary development environment for planning, implementation, testing, debugging, security review, accessibility review, and deployment validation.
- **IBM watsonx.ai / Granite:** bounded sequential script analysis.
- **React, TypeScript, and Vite:** local-first creator workspace.
- **XState:** deterministic analysis workflow.
- **IndexedDB through Dexie:** local script and result persistence.
- **Cloudflare Worker and Hono:** credential-protecting model gateway.
- **Zod:** shared runtime contracts.
- **Validated fixture provider:** deterministic, clearly labelled demonstration mode.

## How IBM Bob was used

IBM Bob is the required primary development tool for Ghost Audience. The repository preserves verifiable Bob activity under `docs/bob/`, including:

- architecture review;
- repository bootstrap;
- core no-hindsight engine work;
- adversarial and recovery tests;
- debugging sessions;
- security and accessibility review;
- deployment verification;
- final repository audit.

Other development and AI tools may assist, as permitted by the official FAQ, but the project documentation must truthfully distinguish their contributions.

## Core innovation

For two scripts with identical prefixes but different endings, Ghost Audience must construct byte-identical neutral analysis requests until the stories diverge. This prefix-independence test is the main proof that future text is not supplied to earlier analysis steps.

## Privacy

Scripts, projects, and accepted results are stored locally in the browser by default. Live analysis sends only the current segment and bounded prior state to the configured AI provider. Fixture mode sends no script to an AI provider.

## Limitations

- The system generates plausible, evidence-grounded audience questions; it does not represent all viewers.
- Model pretraining knowledge cannot be perfectly erased.
- The tool is not a box-office, quality, or virality predictor.
- It does not automatically rewrite the creator's work.
- Human readers remain the final authority.

## Run locally

Requirements:

- Node.js 24.18.0
- pnpm 11.14.0
- Python 3.13 through `uv` for evaluation tools
