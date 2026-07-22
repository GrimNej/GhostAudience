# Long Input Recovery

## Incident

On 2026-07-22, repeated audience reads eventually failed in IndexedDB with:

```text
questionEvents.bulkAdd(): ConstraintError: Key already exists in the object store.
```

A 5,000-word project made the problem visible, but input length was not the direct cause. Model-generated operation IDs such as `operation_0001` were being used as globally unique browser database keys. Models can reuse those IDs in another response or run, so enough testing eventually produced a collision.

Production capacity verification also revealed two independent recovery gaps:

- The deterministic preview provider only understood the bundled demo text.
- Recovery evidence could exceed the contract limit when a long passage contained no sentence punctuation.
- The watsonx safety ceiling reported that continuity was available but did not automatically route the request to it.

## Corrections

- Treat every model-generated ID as untrusted input.
- Derive stable internal question-operation, fact, assumption, and knowledge-operation IDs from the run, section ordinal, position, operation type, and source ID.
- Scope IndexedDB event keys to the run while preserving the domain event ID inside each record. This avoids a database migration and remains compatible with existing browser projects.
- Process same-response questions sequentially, so duplicate semantic questions become reinforcement instead of duplicate opens.
- Support same-response assumption creation and updates through canonical ID aliases.
- Ground deterministic preview output in arbitrary input instead of requiring demo quotes.
- Split punctuation-free evidence into exact source ranges no longer than 460 characters.
- Route new work through the connected Workers AI continuity model when the primary watsonx token reservation cannot be made.
- Keep completed sections committed and allow a failed run to continue from the first unfinished section.

## Capacity Contract

- Composer limit: 20,000 words.
- Verified fixture input: exactly 5,000 words.
- Verified production input: exactly 5,000 words and 36,390 characters.
- Verified production segmentation: 10 ordered reading sections.
- Parser regression check: every section remains within 900 words and 9,000 UTF-8 bytes.

## Verification Evidence

- The original failed production project resumed and completed all 10 sections.
- The final three sections returned HTTP 200 after the watsonx safety ceiling through automatic continuity.
- Results contained 16 meaningful audience questions and 10 grounded understanding signals.
- Reloading the completed Results page preserved the report.
- The post-reload browser console contained zero application errors.
- Repeating model IDs across runs, repeated semantic opens, assumption aliases, arbitrary fixture input, punctuation-free evidence, repository persistence, and storage error messages all have regression coverage.

## Recovery For Existing Projects

Existing projects do not need to be recreated. Open the failed project, go to **Analysis**, and choose **Continue analysis**. Completed sections remain intact and the first unfinished section is retried under the corrected ID and continuity rules.
