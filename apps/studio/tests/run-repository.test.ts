import {
  EMPTY_INTENT_CONTRACT,
  operationId,
  questionId,
  runId,
  segmentId,
} from "@ghost-audience/domain";
import { afterEach, describe, expect, it } from "vitest";
import { GhostAudienceDatabase } from "../src/infrastructure/db/database";
import { RunRepository } from "../src/infrastructure/db/run-repository";

const hash = "a".repeat(64);
const manifestHash = "b".repeat(64);

function segmentFixture() {
  return {
    id: segmentId("segment_00000001"),
    ordinal: 0,
    kind: "scene" as const,
    heading: null,
    text: "Mira stops.",
    globalStartOffset: 0,
    globalEndOffset: 11,
    sha256: hash,
  };
}

describe("RunRepository", () => {
  const databases: GhostAudienceDatabase[] = [];

  afterEach(async () => {
    for (const database of databases) {
      database.close();
      await database.delete();
    }
    databases.length = 0;
  });

  it("commits the accepted step atomically and replays a duplicate before cursor validation", async () => {
    const database = new GhostAudienceDatabase(`test-${crypto.randomUUID()}`);
    databases.push(database);
    const repository = new RunRepository(database);
    const now = new Date().toISOString();
    const created = await repository.create({
      projectId: "project_00000001",
      scriptId: "script_00000001",
      scriptHash: hash,
      segmentManifestHash: manifestHash,
      intentSnapshot: EMPTY_INTENT_CONTRACT,
      prefixHashes: [hash],
      providerMode: "fixture",
      modelId: "fixture-v1",
      promptVersion: "fixture-v1",
      now,
    });
    await database.runs.update(created.id, {
      activeFence: 1,
    });

    const segment = segmentFixture();
    const event = {
      operationId: operationId("operation_00000001"),
      type: "QUESTION_OPENED" as const,
      question: {
        id: questionId("question_00000001"),
        runId: runId(created.id),
        semanticKey: "motivation|mira|stops|door",
        text: "Why does Mira stop?",
        kind: "motivation" as const,
        severity: "curiosity" as const,
        openedAtOrdinal: 0,
        lastChangedAtOrdinal: 0,
        evidence: [
          {
            segmentId: segment.id,
            startOffset: 0,
            endOffset: 11,
            quote: "Mira stops.",
          },
        ],
        rationale: "The action is unexplained.",
        minimalClarification: null,
      },
    };
    const input = {
      runId: created.id,
      fence: 1,
      ordinal: 0,
      requestId: "request_00000001",
      idempotencyKey: hash,
      providerMode: "fixture" as const,
      modelId: "fixture-v1",
      promptVersion: "fixture-v1",
      rawValidatedResponse: {
        schemaVersion: "1.0" as const,
        requestId: "request_00000001",
        factsAdded: [],
        assumptionsAdded: [],
        assumptionUpdates: [],
        questionOperations: [],
        warnings: [],
      },
      questionEvents: [event],
      knowledgeEvents: [],
      segments: [segment],
      now,
    };

    const first = await repository.commitStep(input);
    const duplicate = await repository.commitStep(input);

    expect(first.processedThroughOrdinal).toBe(0);
    expect(duplicate.processedThroughOrdinal).toBe(0);
    expect(await database.runSteps.count()).toBe(1);
    expect(await database.questionEvents.count()).toBe(1);
    expect((await database.runs.get(created.id))?.committedThroughOrdinal).toBe(0);
  });

  it("rejects a stale fencing token", async () => {
    const database = new GhostAudienceDatabase(`test-${crypto.randomUUID()}`);
    databases.push(database);
    const repository = new RunRepository(database);
    const created = await repository.create({
      projectId: "project_00000002",
      scriptId: "script_00000002",
      scriptHash: hash,
      segmentManifestHash: manifestHash,
      intentSnapshot: EMPTY_INTENT_CONTRACT,
      prefixHashes: [hash],
      providerMode: "fixture",
      modelId: "fixture-v1",
      promptVersion: "fixture-v1",
      now: new Date().toISOString(),
    });
    await database.runs.update(created.id, {
      activeFence: 2,
    });

    await expect(
      repository.commitStep({
        runId: created.id,
        fence: 1,
        ordinal: 0,
        requestId: "request_00000002",
        idempotencyKey: "c".repeat(64),
        providerMode: "fixture",
        modelId: "fixture-v1",
        promptVersion: "fixture-v1",
        rawValidatedResponse: {
          schemaVersion: "1.0",
          requestId: "request_00000002",
          factsAdded: [],
          assumptionsAdded: [],
          assumptionUpdates: [],
          questionOperations: [],
          warnings: [],
        },
        questionEvents: [],
        knowledgeEvents: [],
        segments: [segmentFixture()],
        now: new Date().toISOString(),
      }),
    ).rejects.toThrow(/fence/iu);
  });

  it("records terminal and failed statuses while rejecting a missing run", async () => {
    const database = new GhostAudienceDatabase(`test-${crypto.randomUUID()}`);
    databases.push(database);
    const repository = new RunRepository(database);
    const created = await repository.create({
      projectId: "project_00000003",
      scriptId: "script_00000003",
      scriptHash: hash,
      segmentManifestHash: manifestHash,
      intentSnapshot: EMPTY_INTENT_CONTRACT,
      prefixHashes: [hash],
      providerMode: "fixture",
      modelId: "fixture-v1",
      promptVersion: "fixture-v1",
      now: "2026-07-18T00:00:00.000Z",
    });

    await repository.setStatus(created.id, "completed", "2026-07-18T00:01:00.000Z");
    expect((await database.runs.get(created.id))?.completedAt).toBe(
      "2026-07-18T00:01:00.000Z",
    );

    await repository.setStatus(created.id, "failed", "2026-07-18T00:02:00.000Z", {
      code: "NETWORK",
      message: "Temporary network interruption.",
    });
    expect(await database.runs.get(created.id)).toMatchObject({
      completedAt: null,
      failureCode: "NETWORK",
      failureMessage: "Temporary network interruption.",
    });

    await expect(
      repository.setStatus("run_missing", "ready", "2026-07-18T00:03:00.000Z"),
    ).rejects.toThrow(/does not exist/iu);
  });
});
