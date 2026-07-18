# Ghost Audience

**Meet your audience before you present, publish, or perform.**

Ghost Audience lets a creator paste any substantial piece of text and receive a simulated first-audience read before sharing it with real people. It works with speeches, stories, fiction, articles, pitches, scripts, and other written content. The result shows what landed, what may confuse people, and the questions a real audience may ask.

Public application: [audience.grimnej.com](https://audience.grimnej.com)

## How To Use It

1. Open the application and choose **Analyze your content**.
2. Paste a complete speech, story, script, article, pitch, essay, or other cluster of text. You can also import a TXT, Markdown, or Fountain file.
3. Select **Analyze my content**. A title and creator context are optional.
4. Let the analysis finish. The application opens Results automatically.
5. Review the likely Q&A, clarity risks, reaction journey, understood facts, exact evidence, and export options in one workspace.

Projects and results stay in the current browser. Returning users can reopen a saved project from the Projects screen.

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

**July Challenge - Reimagine Creative Industries with AI**

Ghost Audience directly supports storytelling and content creation. It helps writers, filmmakers, video essayists, game-narrative designers, educators, and other creators understand how their work unfolds for a first-time audience before publication.

## Why it matters

Human test readers remain essential, but they often arrive late and can be expensive or slow to coordinate. Ghost Audience provides an immediate pre-reader that exposes plausible questions without claiming to replace real audiences or creative judgment.

## AI and technical approach

- **IBM Bob:** primary development environment for planning, implementation, testing, debugging, security review, accessibility review, and deployment validation.
- **IBM watsonx.ai / Llama 3.3 70B Instruct:** primary bounded sequential content analysis.
- **Cloudflare Workers AI / Llama 3.1 8B Fast:** automatic continuity when the primary provider is unavailable or too slow.
- **React, TypeScript, and Vite:** local-first creator workspace.
- **Analysis controller and locks:** deterministic, resumable analysis workflow.
- **IndexedDB through Dexie:** local script and result persistence.
- **Cloudflare Worker and Hono:** credential-protecting model gateway.
- **Zod:** shared runtime contracts.
- **Validated fixture provider:** deterministic, clearly labelled demonstration mode.

## How IBM Bob was used

IBM Bob is the required primary development tool for Ghost Audience. Before submission, the project owner must preserve genuine, verifiable Bob activity under `docs/BOB/`, including:

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
