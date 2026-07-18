# Ghost Audience Product Contract

## The Promise

A creator brings a substantial piece of text. Ghost Audience lets a simulated first audience encounter it in order, then returns useful preparation for the real audience.

The basic journey must always remain:

1. Add text.
2. Analyze it.
3. Review the audience read.

No setup questionnaire is required. A title and creator context may improve organization or interpretation, but both are optional.

## Accepted Creative Work

The product is intentionally broad. Useful inputs include:

- speeches and presentations;
- stories, fiction, and narrative scenes;
- video, podcast, and stage scripts;
- pitches and proposals;
- articles, essays, and newsletters;
- educational explanations;
- any other coherent cluster of text intended for an audience.

TXT, Markdown, and Fountain files can be imported. Pasted text requires no special formatting.

## What The Audience Read Must Answer

Every useful report should help the creator answer three questions:

1. What did the audience understand?
2. What could confuse, weaken, or distract the audience?
3. What might people ask next?

The third answer includes clarification questions, objections, curiosity, what-happens-next questions, missing definitions, unsupported leaps, practical concerns, and likely real-world Q&A.

## Evidence And Honesty

- Every accepted finding must cite the creator's actual words.
- Earlier reactions must not use future sections.
- Curiosity is not automatically a defect.
- The product simulates plausible audience reactions. It does not claim to represent every real person.
- Ghost Audience does not predict quality, virality, sales, or audience percentages.
- Human readers and the creator remain the final authority.

## Reliability Rule

A creator must not finish a successful run with an empty or unusable report because a model returned malformed JSON or a provider had a temporary outage.

The production path therefore uses:

1. IBM watsonx.ai Llama 3.3 70B Instruct as the primary audience model.
2. One bounded structured-response repair attempt.
3. Cloudflare Workers AI Llama 3.1 8B Fast for provider continuity.
4. Exact-evidence salvage and content-aware question recovery as the final safety net.

The fallback path must remain visible in technical details and warnings, but it must not expose credentials or overwhelm the creator's main workflow.
