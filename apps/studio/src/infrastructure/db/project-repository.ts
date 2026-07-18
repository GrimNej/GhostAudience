import {
  EMPTY_INTENT_CONTRACT,
  type IntentContract,
  projectId,
  type ScriptDocument,
} from "@ghost-audience/domain";
import { nanoid } from "nanoid";
import type { GhostAudienceDatabase } from "./database";
import type { ProjectRecord, ScriptRecord, SegmentRecord } from "./records";

export interface CreateProjectInput {
  readonly name: string;
  readonly now: string;
}

export class ProjectRepository {
  public constructor(private readonly db: GhostAudienceDatabase) {}

  public async create(input: CreateProjectInput): Promise<ProjectRecord> {
    const record: ProjectRecord = {
      id: projectId(`project_${nanoid(20)}`),
      name: input.name.trim() || "Untitled project",
      activeScriptId: null,
      intentContract: EMPTY_INTENT_CONTRACT,
      createdAt: input.now,
      updatedAt: input.now,
    };
    await this.db.projects.add(record);
    return record;
  }

  public get(id: string): Promise<ProjectRecord | undefined> {
    return this.db.projects.get(id);
  }

  public list(): Promise<readonly ProjectRecord[]> {
    return this.db.projects.orderBy("updatedAt").reverse().toArray();
  }

  public async updateIntent(
    projectIdValue: string,
    intentContract: IntentContract,
    now: string,
  ): Promise<void> {
    const changed = await this.db.projects.update(projectIdValue, {
      intentContract: structuredClone(intentContract),
      updatedAt: now,
    });
    if (changed !== 1) {
      throw new Error(`Project ${projectIdValue} does not exist.`);
    }
  }

  public async saveScript(
    projectIdValue: string,
    script: ScriptDocument,
  ): Promise<void> {
    const scriptRecord: ScriptRecord = {
      id: script.id,
      projectId: projectIdValue,
      title: script.title,
      sourceFormat: script.sourceFormat,
      normalizedText: script.normalizedText,
      sha256: script.sha256,
      segmentManifestHash: script.segmentManifestHash,
      wordCount: script.wordCount,
      createdAt: script.createdAt,
      updatedAt: script.updatedAt,
    };
    const segmentRecords: readonly SegmentRecord[] = script.segments.map((segment) => ({
      ...segment,
      scriptId: script.id,
    }));

    await this.db.transaction(
      "rw",
      [this.db.projects, this.db.scripts, this.db.segments, this.db.auditEvents],
      async () => {
        const project = await this.db.projects.get(projectIdValue);
        if (project === undefined) {
          throw new Error(`Project ${projectIdValue} does not exist.`);
        }

        const existing = await this.db.scripts.get(script.id);
        if (
          existing !== undefined &&
          (existing.sha256 !== script.sha256 ||
            existing.segmentManifestHash !== script.segmentManifestHash)
        ) {
          throw new Error("Immutable script-version ID collision.");
        }

        if (existing === undefined) {
          await this.db.scripts.add(scriptRecord);
          await this.db.segments.bulkAdd(segmentRecords);
        }
        await this.db.projects.update(projectIdValue, {
          activeScriptId: script.id,
          name: script.title,
          updatedAt: script.updatedAt,
        });
        await this.db.auditEvents.add({
          runId: null,
          type: "SCRIPT_VERSION_ACTIVATED",
          metadata: {
            projectId: projectIdValue,
            scriptVersionId: script.id,
            segmentManifestHash: script.segmentManifestHash,
            segmentCount: segmentRecords.length,
          },
          createdAt: script.updatedAt,
        });
      },
    );
  }

  public async deleteProject(projectIdValue: string, now: string): Promise<void> {
    await this.db.transaction(
      "rw",
      [
        this.db.projects,
        this.db.scripts,
        this.db.segments,
        this.db.runs,
        this.db.runSteps,
        this.db.questions,
        this.db.questionEvents,
        this.db.knowledgeEvents,
        this.db.creatorReviews,
        this.db.auditEvents,
        this.db.runLeases,
      ],
      async () => {
        const project = await this.db.projects.get(projectIdValue);
        if (project === undefined) return;

        const scripts = await this.db.scripts
          .where("projectId")
          .equals(projectIdValue)
          .toArray();
        const scriptIds = scripts.map((script) => script.id);
        const runs = await this.db.runs
          .where("projectId")
          .equals(projectIdValue)
          .toArray();
        const runIds = runs.map((run) => run.id);

        for (const runIdValue of runIds) {
          await Promise.all([
            this.db.runSteps.where("runId").equals(runIdValue).delete(),
            this.db.questions.where("runId").equals(runIdValue).delete(),
            this.db.questionEvents.where("runId").equals(runIdValue).delete(),
            this.db.knowledgeEvents.where("runId").equals(runIdValue).delete(),
            this.db.creatorReviews.where("runId").equals(runIdValue).delete(),
            this.db.auditEvents.where("runId").equals(runIdValue).delete(),
            this.db.runLeases.delete(runIdValue),
          ]);
        }

        for (const scriptIdValue of scriptIds) {
          await this.db.segments.where("scriptId").equals(scriptIdValue).delete();
        }

        await this.db.runs.where("projectId").equals(projectIdValue).delete();
        await this.db.scripts.where("projectId").equals(projectIdValue).delete();
        await this.db.projects.delete(projectIdValue);
        await this.db.auditEvents.add({
          runId: null,
          type: "PROJECT_DELETED",
          metadata: { projectId: projectIdValue },
          createdAt: now,
        });
      },
    );
  }
}
