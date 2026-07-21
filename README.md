<p align="center">
  <img src="docs/assets/ghost-audience-banner.svg" alt="Ghost Audience — meet your audience before you present, publish, or perform" width="100%" />
</p>

<p align="center">
  <img src="docs/assets/ghost-audience-logo.svg" alt="Ghost Audience logo" width="88" />
</p>

<h1 align="center">Ghost Audience</h1>

<p align="center">
  <strong>Meet your audience before you present, publish, or perform.</strong><br />
  Paste any speech, story, pitch, or article. A ghost audience reads it the way a real audience would —
  section by section, with no idea what's coming next — and tells you the questions they'll ask before you're in the room.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/IBM_watsonx.ai-172522?style=for-the-badge&logo=ibm&logoColor=ec6f55" alt="IBM watsonx.ai" />
  <img src="https://img.shields.io/badge/Cloudflare_Workers-172522?style=for-the-badge&logo=cloudflareworkers&logoColor=F38020" alt="Cloudflare Workers" />
  <img src="https://img.shields.io/badge/React_19-172522?style=for-the-badge&logo=react&logoColor=6fc5b9" alt="React 19" />
  <img src="https://img.shields.io/badge/TypeScript-172522?style=for-the-badge&logo=typescript&logoColor=b9cfc8" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Vite-172522?style=for-the-badge&logo=vite&logoColor=efb860" alt="Vite" />
  <img src="https://img.shields.io/badge/Hono-172522?style=for-the-badge&logo=hono&logoColor=ec6f55" alt="Hono" />
  <img src="https://img.shields.io/badge/Zod-172522?style=for-the-badge&logo=zod&logoColor=c0a6fa" alt="Zod" />
  <img src="https://img.shields.io/badge/Dexie%2FIndexedDB-172522?style=for-the-badge&logo=googlechrome&logoColor=6fc5b9" alt="Dexie" />
</p>

<p align="center">
  <a href="https://audience.grimnej.com"><strong>Open Ghost Audience</strong></a> ·
  <a href="#the-problem">The Problem</a> ·
  <a href="#how-it-works">How It Works</a> ·
  <a href="#system-architecture">Architecture</a> ·
  <a href="#features">Features</a> ·
  <a href="#development">Development</a>
</p>

---

## The problem

Imagine you gave a speech. You prepared for it, you rehearsed it, you knew every word. You get up there, you deliver it — and then in the Q&A, someone raises their hand and asks something you hadn't prepared for at all. Not a complicated question. Actually a really obvious one. One that, in hindsight, you can't believe you missed. But you did.

Maybe it wasn't a speech. Maybe it was a pitch to an investor and they asked something about a part you thought was self-explanatory. Or you published an article and a reader in the comments said they were confused by a section you thought was crystal clear. Or you submitted a piece of writing and got feedback saying "this part doesn't land" — and you re-read it and thought, "it lands perfectly... to me."

That's the problem. **You cannot read your own content as a stranger.** You've been inside it too long. You know how it ends, you know what every sentence is building toward, you know all the context your audience doesn't have. And no matter how hard you try, you cannot un-know that.

Most AI tools make this worse: they read your entire content before reacting to the beginning. That gives the model your ending before it evaluates your opening — exactly the thing your real audience will never have.

## How it works

Ghost Audience reads your content **the way your audience would** — section by section, in order, with no access to what comes next.

<p align="center">
  <img src="docs/assets/ghost-audience-flow.svg" alt="Animated no-hindsight analysis flow from creator text to evidence report" width="100%" />
</p>

When it's reading section one, it genuinely has no idea what's in section two. That's not a limitation — that's the whole point. Each section is analysed with only what the audience could already know from everything they've read so far. The result is a report that reflects what a first-time reader would actually think, feel, and ask — not what someone who already knows the ending would say.

Every question it surfaces is backed by a specific quote from your text. It's not guessing. It's pointing at your words and saying: "this is why they'll ask that."

Here's what's in each analysis request for a given section:

- Everything the audience has understood so far (accumulated section by section)
- The current section text
- Any questions still open from earlier sections
- No future content. None.

### The no-hindsight guarantee

If you took two pieces of writing with identical openings but different endings, Ghost Audience would produce byte-identical analysis for everything up to where they diverge. That's the proof that future content is genuinely not leaking into earlier reactions.

## System architecture

<p align="center">
  <img src="docs/assets/ghost-audience-architecture.svg" alt="Ghost Audience system architecture: browser workspace, Cloudflare Worker gateway, IBM watsonx.ai, Workers AI fallback, D1 rate limiting, and local IndexedDB persistence" width="100%" />
</p>

Your content never needs to leave your browser to be stored anywhere. Projects and results stay local in your browser by default. When you run an analysis, a Cloudflare Worker handles the AI calls — keeping your API credentials completely hidden on the server side, never in the browser.

The primary AI model is IBM watsonx.ai running Llama 3.3 70B. If IBM is slow or unavailable for any reason, Cloudflare Workers AI automatically takes over as a fallback — no user action needed, no empty report.

## Features

| Feature | What it does |
|---|---|
| **Audience questions** | The real questions a first-time reader would likely ask — categorised by curiosity, clarity risk, or blocking confusion |
| **Clarity risks** | The specific passages that may confuse, lose, or mislead your audience |
| **Reaction journey** | How audience emotion and understanding shifts section by section through your content |
| **Audience understanding** | What facts and context the audience has actually absorbed by each point in the read |
| **Exact evidence** | Every finding is pinned to a verbatim quote from your text — no vague claims, ever |
| **Intent review** | Mark any finding as intended, acceptable, accidental, or an AI misread |
| **File import** | Import TXT, Markdown, or Fountain files in addition to paste |
| **Automatic continuity** | Workers AI silently takes over if IBM watsonx.ai is slow or unavailable |
| **Fixture / demo mode** | Full working UI with sample data — no API key or network connection required |
| **Export** | Download your full results as Markdown or JSON |
| **Local-first** | Everything stays in your browser — no account, no sign-in, no server storage |

## Using Ghost Audience

1. Open [audience.grimnej.com](https://audience.grimnej.com).
2. Click **Analyze your content**.
3. Paste your text, or import a `.txt`, `.md`, or `.fountain` file. A title is optional and won't block anything.
4. Click **Analyze my content**. The app splits your text into sections and reads each one in order.
5. Results open automatically when the read is done. You'll see the questions, clarity risks, the reaction journey, what the audience understood, and all the supporting evidence.
6. Open any question to see its exact source quote and mark it as intended, acceptable, accidental, or an AI misread.
7. Come back any time — your projects are saved locally in the browser. No sign-in needed.

## Who it's for

Ghost Audience is useful for anyone who creates content that an audience will experience in sequence:

- **Speakers and presenters** — prepare for the Q&A before the Q&A
- **Writers and authors** — find out where a first reader will get lost or confused
- **Screenwriters and playwrights** — see which character motivations and plot questions an audience carries from scene to scene
- **Educators** — understand which explanations don't land for someone encountering the material for the first time
- **Journalists and essayists** — catch the assumptions that are obvious to you but invisible to a reader
- **Pitchers and founders** — find the questions investors will ask before you're in the room

## Privacy

Scripts and results are stored locally in your browser by default. When you run a live analysis, only the current section and the bounded audience state accumulated so far are sent to the AI provider. Nothing else. Fixture mode sends nothing to any external service at all.

## Built with IBM

Ghost Audience was built end-to-end using **IBM Bob** as the primary development environment — from architecture and planning through implementation, testing, debugging, and deployment. IBM Bob was not an optional add-on. It was the tool the whole project was built with.

The AI audience itself runs on **IBM watsonx.ai**, using `meta-llama/llama-3-3-70b-instruct` through the watsonx.ai Runtime Lite. This is a real IBM runtime integration, not a wrapper — it's what powers the analysis for every live run.

This project was submitted to the **AI Builders Challenge with IBM Bob — July 2026**, under the theme "Reimagine Creative Industries with AI."

## Repository map

```text
apps/
  studio/              React + Vite creator workspace
    src/features/      analysis · intent · landing · project · results · script · timeline …
    worker/            Hono Cloudflare Worker gateway (AI proxy, rate limits, auth)
packages/
  contracts/           Shared Zod API + domain contracts
  domain/              Core domain logic
  parser/              Script segmentation and parsing
  test-fixtures/       Deterministic fixture data for demo mode and tests
migrations/            Cloudflare D1 SQL migrations
docs/
  assets/              SVG diagrams and visual assets
  DEPLOYMENT.md        Production deployment guide
  DEPLOYMENT_RECORD.md Verified production release record
  PROJECT_STATUS.md    Current project status
```

## Development

### Prerequisites

- Node.js `24.18.0`
- pnpm `11.14.0`
- Python `3.13` through `uv` for evaluation tools

### Install and validate

```bash
corepack enable
pnpm install --frozen-lockfile

pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

### Run locally

```bash
# Apply local D1 migrations
pnpm --filter @ghost-audience/studio run db:migrate:local

# Start dev server (Vite + Worker via Wrangler)
pnpm --filter @ghost-audience/studio run dev
```

Copy `apps/studio/.dev.vars.example` to `apps/studio/.dev.vars` and add your `WATSONX_API_KEY` and `WATSONX_PROJECT_ID` for live analysis. Fixture mode works without any credentials at all.

### Run tests

```bash
# Unit and integration tests
pnpm --filter @ghost-audience/studio run test

# With coverage
pnpm --filter @ghost-audience/studio run test:coverage

# Browser / E2E tests (Playwright)
pnpm --filter @ghost-audience/studio run test:e2e
```

## Tech stack

| Layer | Technology |
|---|---|
| Primary analysis | IBM watsonx.ai · `meta-llama/llama-3-3-70b-instruct` |
| Automatic continuity | Cloudflare Workers AI · `@cf/meta/llama-3.1-8b-instruct-fast` |
| Creator workspace | React 19, TypeScript, Vite, React Router, TanStack Query |
| Edge gateway | Cloudflare Worker, Hono 4 |
| Rate limiting | Cloudflare D1 (`ghost-audience-control`) |
| Local persistence | Dexie 4 / IndexedDB |
| Runtime contracts | Zod 4 |
| Testing | Vitest, Playwright, axe-core |

## Delivery status

Ghost Audience is live at [audience.grimnej.com](https://audience.grimnej.com).

Verified on 2026-07-18: 72 TypeScript unit and integration tests pass. 16 browser tests across Chromium, Firefox, WebKit, and mobile Chromium pass. Studio test coverage is at 90.95% statements, 80.21% branches, and 94.17% lines. GitHub Actions CI, Security, and Submission Gate workflows all passed for release commit `beda893`.

A live end-to-end acceptance test using a 504-word narrative produced 6 questions, 4 clarity risks, and 2 clear audience signals — with zero console errors and full persistence after a page reload.

See [`docs/DEPLOYMENT_RECORD.md`](docs/DEPLOYMENT_RECORD.md) for the full release record and [`docs/PROJECT_STATUS.md`](docs/PROJECT_STATUS.md) for current project state.

## Honest limitations

- Ghost Audience simulates a plausible audience — it doesn't claim to represent every real person who might read your work.
- AI model pretraining knowledge can't be completely erased, so some reactions may reflect general world knowledge rather than just your text.
- It won't predict quality, virality, or audience numbers.
- It won't rewrite your work for you.
- Human readers remain the final word. This tool helps you get there better prepared.
