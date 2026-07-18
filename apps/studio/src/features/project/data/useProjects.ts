import { useLiveQuery } from "dexie-react-hooks";
import { useMemo } from "react";

import { useDatabase } from "../../../app/database-context";
import { ProjectRepository } from "../../../infrastructure/db/project-repository";

export function useProjectRepository(): ProjectRepository {
  const database = useDatabase();

  return useMemo(() => new ProjectRepository(database), [database]);
}

export function useProjects() {
  const repository = useProjectRepository();

  return useLiveQuery(() => repository.list(), [repository], undefined);
}
