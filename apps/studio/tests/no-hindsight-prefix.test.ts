import {
  type AudienceState,
  createEmptyAudienceState,
  questionId,
  runId,
  type ScriptDocument,
  type ScriptSegment,
} from "@ghost-audience/domain";
import { computePrefixHashChain } from "@ghost-audience/parser";
import { describe, expect, it } from "vitest";
import {
  buildStepAnalysisInput,
  canonicalJson,
} from "../src/features/analysis/domain/build-step-input";
import { inspectForFutureCanary } from "../src/features/analysis/domain/future-canary";

const sharedHash = "a".repeat(64);
const differentHash = "b".repeat(64);
const manifestA = "c".repeat(64);
const manifestB = "d".repeat(64);

function segment(
  id: string,
  ordinal: number,
  text: string,
  sha256: string,
): ScriptSegment {
  return {
    id: id as ScriptSegment["id"],
    ordinal,
    kind: "scene",
    heading: `Scene ${ordinal + 1}`,
    text,
    globalStartOffset: 0,
    globalEndOffset: text.length,
    sha256,
  };
}

function script(
  id: string,
  manifest: string,
  endingText: string,
  endingHash: string,
): ScriptDocument {
  const first = segment(`${id}_first`, 0, "Mira stops at the gate.", sharedHash);
  const ending = segment(`${id}_ending`, 1, endingText, endingHash);
  return {
    id: id as ScriptDocument["id"],
    title: "Differential fixture",
    sourceFormat: "plain",
    normalizedText: `${first.text}\n\n${ending.text}`,
    sha256: endingHash,
    segmentManifestHash: manifest,
    wordCount: 10,
    segments: [first, ending],
    createdAt: "2026-07-18T00:00:00.000Z",
    updatedAt: "2026-07-18T00:00:00.000Z",
  };
}

function firstSegment(document: ScriptDocument): ScriptSegment {
  const first = document.segments[0];
  if (first === undefined) {
    throw new Error("Differential fixtures must include an opening segment.");
  }
  return first;
}

describe("prefix-independent neutral requests", () => {
  it("creates identical first-step requests for different endings", async () => {
    const scriptA = script("script_version_a", manifestA, "ENDING A", differentHash);
    const scriptB = script("script_version_b", manifestB, "ENDING B", "e".repeat(64));
    const prefixA = await computePrefixHashChain(
      scriptA.segments.map((value) => value.sha256),
    );
    const prefixB = await computePrefixHashChain(
      scriptB.segments.map((value) => value.sha256),
    );
    const state = createEmptyAudienceState(runId("run_prefix_test"));
    const common = {
      requestId: "request_prefix_test",
      runId: "run_prefix_test",
      priorState: state,
      promptVersion: "step-v1",
      modelId: "ibm/granite-4-h-small",
    } as const;

    const requestA = await buildStepAnalysisInput({
      ...common,
      script: scriptA,
      currentSegment: firstSegment(scriptA),
      prefixHashes: prefixA,
    });
    const requestB = await buildStepAnalysisInput({
      ...common,
      script: scriptB,
      currentSegment: firstSegment(scriptB),
      prefixHashes: prefixB,
    });

    expect(canonicalJson(requestA)).toBe(canonicalJson(requestB));
    expect(JSON.stringify(requestA)).not.toContain("intentContract");
  });

  it("builds later requests from bounded state and rejects invalid cursors or hashes", async () => {
    const document = script("script_later", manifestA, "ENDING", differentHash);
    const prefixHashes = await computePrefixHashChain(
      document.segments.map((value) => value.sha256),
    );
    const laterSegment = document.segments[1];
    if (laterSegment === undefined) throw new Error("Expected a second segment.");
    const state: AudienceState = {
      runId: runId("run_later_test"),
      processedThroughOrdinal: 0,
      facts: [],
      assumptions: [],
      questions: [
        {
          id: questionId("question_low_priority"),
          runId: runId("run_later_test"),
          semanticKey: "reference|gate|owner",
          text: "Who owns the gate?",
          kind: "reference",
          status: "open",
          severity: "curiosity",
          openedAtOrdinal: 0,
          lastChangedAtOrdinal: 0,
          evidence: [],
          rationale: "The owner is not yet known.",
          minimalClarification: null,
          creatorDisposition: "unreviewed",
          resolvedAtOrdinal: null,
          answerEvidence: [],
          relatedQuestionIds: [],
          revision: 0,
        },
        {
          id: questionId("question_high_priority"),
          runId: runId("run_later_test"),
          semanticKey: "stakes|gate|danger",
          text: "What happens if Mira enters?",
          kind: "stakes",
          status: "partially_answered",
          severity: "blocking_confusion",
          openedAtOrdinal: 0,
          lastChangedAtOrdinal: 1,
          evidence: [],
          rationale: "The consequence is not yet known.",
          minimalClarification: null,
          creatorDisposition: "unreviewed",
          resolvedAtOrdinal: null,
          answerEvidence: [],
          relatedQuestionIds: [],
          revision: 0,
        },
      ],
      compactNarrativeState: "Mira has reached the gate.",
      revision: 1,
      appliedOperationIds: new Set(),
    };
    const common = {
      requestId: "request_later_test",
      runId: "run_later_test",
      script: document,
      currentSegment: laterSegment,
      prefixHashes,
      promptVersion: "step-v1",
      modelId: "fixture-v1",
    } as const;

    const input = await buildStepAnalysisInput({ ...common, priorState: state });

    expect(input.activeQuestions.map((question) => question.id)).toEqual([
      "question_high_priority",
      "question_low_priority",
    ]);
    expect(input.currentSegment.id).not.toBe(laterSegment.id);
    expect(input.idempotencyKey).toHaveLength(64);

    await expect(
      buildStepAnalysisInput({
        ...common,
        priorState: { ...state, processedThroughOrdinal: -1 },
      }),
    ).rejects.toThrow(/cursor mismatch/iu);
    await expect(
      buildStepAnalysisInput({ ...common, prefixHashes: [], priorState: state }),
    ).rejects.toThrow(/missing prefix hash/iu);
  });

  it("canonicalizes nested values and detects future canaries at every path", () => {
    expect(canonicalJson({ z: [true, null, "value"], a: 1 })).toBe(
      '{"a":1,"z":[true,null,"value"]}',
    );
    expect(
      inspectForFutureCanary(
        {
          first: "safe",
          nested: ["FUTURE_CANARY", { ending: "FUTURE_CANARY" }],
          empty: null,
        },
        "FUTURE_CANARY",
      ),
    ).toEqual({ found: true, paths: ["$.nested[0]", "$.nested[1].ending"] });
    expect(inspectForFutureCanary(42, "FUTURE_CANARY")).toEqual({
      found: false,
      paths: [],
    });
  });
});
