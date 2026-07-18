# Ghost Audience Experience Rebuild

## Goal

Turn Ghost Audience into a clear three-step product:

1. Add content by pasting text or importing a supported file.
2. Start a first-time audience analysis with one primary action.
3. Review audience questions, clarity risks, understanding, and exports in one results workspace.

## Product Decisions

- A title is optional. Imported filenames and a safe default provide one automatically.
- Plain text, Markdown, and Fountain files can be imported directly.
- Segmentation is automatic and described as sections in the interface.
- Creator context is optional and collapsed by default. It never blocks analysis.
- Live analysis is the normal production path. Fixture analysis remains available only as a clearly labelled local preview when live analysis is unavailable.
- Provider names, model IDs, prefix hashes, and run leases are implementation details. They belong in a technical details disclosure, not the primary journey.
- Analysis completion opens Results automatically.
- Results combine the most useful parts of the old Timeline, Mindboard, and Report pages.
- Existing project URLs remain valid through redirects.

## Reliability Acceptance Criteria

- A malformed model response receives one bounded repair attempt.
- If the repaired response is still invalid, the Worker commits a deterministic evidence-backed fact from the current section and continues the run.
- A provider-format problem must not leave an ordinary user at zero committed sections.
- Repeated clicks in the same tab are idempotent and do not show a false competing-tab error.
- Failed or cancelled runs show a plain-language retry action.

## Experience Acceptance Criteria

- A new user can paste content and reach analysis with one primary button.
- A returning user can see project status and open the most relevant next view.
- The primary project navigation contains only Content, Analysis, and Results.
- The interface explains what will happen next at every stage.
- The production flow works with keyboard navigation and responsive layouts.
- User-facing copy does not use em dashes.

## Verification Checklist

- [x] Unit and integration tests
- [x] Production build
- [x] Chromium, Firefox, and WebKit end-to-end tests
- [x] Mobile Chromium test
- [x] Automated accessibility scan
- [x] Real browser test against the deployed custom domain
- [x] Live provider run using the owner's multi-section Iron Crag narrative
- [x] Exact question evidence and detail view
- [x] Refresh persistence
- [x] GitHub Actions verification after the final push

## Verified Release Result

The public application accepted the 504-word Iron Crag story without creator context, split it into two sections, completed both analysis requests with HTTP 200, and opened Results automatically. The report contained 6 evidence-backed questions, 4 clarity risks, and 2 clear signals. The browser had zero application errors and the report survived a full reload.

GitHub Actions also passed the CI, Security, and full Submission Gate workflows for the release correction commit. The Submission Gate executed the same 16-test browser matrix on its hosted Ubuntu runner with local fixture bindings and no production credentials.
