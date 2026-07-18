import { useLiveQuery } from "dexie-react-hooks";
import { useProject, useWorkspaceRepository } from "../../project/data/use-project-workspace";
import { createMindboardSnapshot } from "../domain/create-mindboard-snapshot";

export function useMindboardData(
  projectId: string,
  selectedOrdinal: number,
) {
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
      const script = await reads.scriptDocument(workspace.script.id);
      const maximumOrdinal = Math.max(
        0,
        Math.min(
          workspace.latestRun.committedThroughOrdinal,
          script.segments.length - 1,
        ),
      );
      const ordinal = Math.min(selectedOrdinal, maximumOrdinal);
      const state = await reads.audienceStateAt(
        workspace.latestRun,
        ordinal,
      );
      return {
        ordinal,
        maximumOrdinal,
        segment: script.segments[ordinal] ?? null,
        snapshot: createMindboardSnapshot(state),
      };
    },
    [reads, selectedOrdinal, workspace],
    undefined,
  );
  return { workspace, value } as const;
}