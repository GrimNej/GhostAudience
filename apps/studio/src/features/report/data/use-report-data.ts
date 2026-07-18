import { useLiveQuery } from "dexie-react-hooks";
import {
  useProject,
  useWorkspaceRepository,
} from "../../project/data/use-project-workspace";
import { buildReportModel } from "../domain/build-report";

export function useReportData(projectId: string) {
  const reads = useWorkspaceRepository();
  const workspace = useProject(projectId);
  const report = useLiveQuery(
    async () => {
      if (
        workspace === undefined ||
        workspace === null ||
        workspace.latestRun === null ||
        workspace.script === null
      ) {
        return null;
      }
      const questions = await reads.questions(workspace.latestRun.id);
      return buildReportModel({
        title: `${workspace.project.name} — Audience Question Report`,
        generatedAt: new Date().toISOString(),
        providerLabel:
          workspace.latestRun.providerMode === "fixture"
            ? "Validated fixture"
            : "IBM watsonx.ai",
        modelId: workspace.latestRun.modelId,
        scriptHash: workspace.latestRun.scriptHash,
        questions,
        intentContract: workspace.latestRun.intentSnapshot,
        optionalSummary: null,
      });
    },
    [reads, workspace],
    undefined,
  );
  return { workspace, report } as const;
}
