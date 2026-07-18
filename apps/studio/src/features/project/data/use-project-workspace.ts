import { useLiveQuery } from "dexie-react-hooks";
import { useMemo } from "react";
import { useDatabase } from "../../../app/database-context";
import { WorkspaceReadRepository } from "../../../infrastructure/db/workspace-read-repository";

export function useWorkspaceRepository(): WorkspaceReadRepository {
  const database = useDatabase();
  return useMemo(() => new WorkspaceReadRepository(database), [database]);
}

export function useProject(projectId: string) {
  const repository = useWorkspaceRepository();
  return useLiveQuery(
    () => repository.projectWorkspace(projectId),
    [repository, projectId],
    undefined,
  );
}
