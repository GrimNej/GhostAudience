# Project Page Copy

## Project name

Ghost Audience

## Tagline

Meet your audience before they exist.

## Selected theme

July Challenge — Reimagine Creative Industries with AI

## Problem

Creators know their entire story, but audiences experience it sequentially. This makes accidental confusion, missing motivation, unclear references, and abandoned narrative questions difficult to detect before publication. Existing AI script reviewers often read the ending before criticizing the beginning, giving them hindsight that a first-time audience never has.

## Solution

Ghost Audience reads a script one immutable segment at a time, reconstructs what a plausible first-time audience could know, and generates evidence-grounded questions. Each question is tracked from opening through reinforcement, partial answer, resolution, contradiction, or staleness. Creators classify findings without surrendering control of their work.

## Innovation

Ghost Audience enforces prefix independence: two scripts with identical beginnings but different endings must produce byte-identical neutral analysis requests until they diverge. Future script text and semantic creator intent are structurally excluded from earlier model requests.

## Technical approach

The local-first React and TypeScript workspace uses XState for deterministic workflow, Dexie/IndexedDB for durable browser state, Zod for shared contracts, and a Cloudflare Worker gateway for protected IBM watsonx.ai/Granite calls. Every accepted finding requires exact source evidence. A validated fixture provider ensures a reliable, honestly labelled demonstration.

## IBM Bob use

IBM Bob was the primary development tool across architecture review, repository bootstrap, core engine implementation, test generation, debugging, security and accessibility review, deployment verification, and final repository audit. Supporting evidence is preserved in the public repository.

## Real-world impact

Ghost Audience gives writers, filmmakers, video essayists, educators, game-narrative designers, and other creators an immediate pre-reader for discovering plausible audience questions before publication. It complements rather than replaces human readers.

## Links

Enter the public GitHub and public demonstration-video links directly on the Event Platform after final publication.