# Ghost Audience Experience Rebuild

## Goal

Turn Ghost Audience into a clear three-step product:

1. Add content by pasting text or importing a supported file.
2. Start a first-time audience analysis with one primary action.
3. Review audience questions, clarity risks, understanding, and exports in one results workspace.

## Product decisions

- A title is optional. Imported filenames and a safe default provide one automatically.
- Plain text, Markdown, and Fountain files can be imported directly.
- Segmentation is automatic and described as sections in the interface.
- Creator context is optional and collapsed by default. It never blocks analysis.
- Live analysis is the normal production path. Fixture analysis remains available only as a clearly labelled local preview when live analysis is unavailable.
- Provider names, model IDs, prefix hashes, and run leases are implementation details. They belong in a technical details disclosure, not the primary journey.
- Analysis completion opens Results automatically.
- Results combine the most useful parts of the old Timeline, Mindboard, and Report pages.
- Existing project URLs remain valid through redirects.

## Reliability acceptance criteria

- A malformed model response receives one bounded repair attempt.
- If the repaired response is still invalid, the Worker commits a deterministic evidence-backed fact from the current section and continues the run.
- A provider-format problem must not leave an ordinary user at zero committed sections.
- Repeated clicks in the same tab are idempotent and do not show a false competing-tab error.
- Failed or cancelled runs show a plain-language retry action.

## Experience acceptance criteria

- A new user can paste content and reach analysis with one primary button.
- A returning user can see project status and open the most relevant next view.
- The primary project navigation contains only Content, Analysis, and Results.
- The interface explains what will happen next at every stage.
- The production flow works with keyboard navigation and responsive layouts.
- User-facing copy does not use em dashes.

## Verification checklist

- Unit and integration tests
- Production build
- Chromium, Firefox, and WebKit end-to-end tests
- Automated accessibility scan
- Real browser test against the deployed custom domain
- Live watsonx.ai run using a multi-section narrative
- GitHub Actions verification after push
