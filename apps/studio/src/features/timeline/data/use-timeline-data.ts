import { useLiveQuery } from "dexie-react-hooks";
import {
  useProject,
  useWorkspaceRepository,
} from "../../project/data/use-project-workspace";

export function useTimelineData(projectId: string) {
  const reads = useWorkspaceRepository();
  const workspace = useProject(projectId);
  const value = useLiveQuery(
    async () => {
      if (
        workspace === undefined ||
        workspace === null ||
        workspace.latestRun === null ||
        workspace.script === null
      ) {
        return null;
      }
      const [questions, script] = await Promise.all([
        reads.questions(workspace.latestRun.id),
        reads.scriptDocument(workspace.script.id),
      ]);
      return {
        run: workspace.latestRun,
        questions,
        segments: script.segments,
      };
    },
    [reads, workspace],
    undefined,
  );
  return { workspace, value } as const;
}
