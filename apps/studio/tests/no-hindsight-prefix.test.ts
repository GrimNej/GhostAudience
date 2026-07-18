import {
  createEmptyAudienceState,
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
  const first = segment(
    `${id}_first`,
    0,
    "Mira stops at the gate.",
    sharedHash,
  );
  const ending = segment(
    `${id}_ending`,
    1,
    endingText,
    endingHash,
  );
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

describe("prefix-independent neutral requests", () => {
  it("creates identical first-step requests for different endings", async () => {
    const scriptA = script(
      "script_version_a",
      manifestA,
      "ENDING A",
      differentHash,
    );
    const scriptB = script(
      "script_version_b",
      manifestB,
      "ENDING B",
      "e".repeat(64),
    );
    const prefixA = await computePrefixHashChain(
      scriptA.segments.map((value) => value.sha256),
    );
    const prefixB = await computePrefixHashChain(
      scriptB.segments.map((value) => value.sha256),
    );
    const state = createEmptyAudienceState(
      runId("run_prefix_test"),
    );
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
      currentSegment: scriptA.segments[0]!,
      prefixHashes: prefixA,
    });
    const requestB = await buildStepAnalysisInput({
      ...common,
      script: scriptB,
      currentSegment: scriptB.segments[0]!,
      prefixHashes: prefixB,
    });

    expect(canonicalJson(requestA)).toBe(
      canonicalJson(requestB),
    );
    expect(JSON.stringify(requestA)).not.toContain(
      "intentContract",
    );
  });
});