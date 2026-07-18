import { useMemo } from "react";
import { useDatabase } from "../../../app/database-context";
import { ProjectRepository } from "../../../infrastructure/db/project-repository";
import { type IntentFormValue, toIntentContract } from "../domain/intent-form";

export interface IntentActions {
  readonly save: (value: IntentFormValue) => Promise<void>;
}

export function useIntentActions(projectId: string): IntentActions {
  const database = useDatabase();
  return useMemo(() => {
    const repository = new ProjectRepository(database);
    return {
      save: async (value: IntentFormValue) => {
        await repository.updateIntent(
          projectId,
          toIntentContract(value),
          new Date().toISOString(),
        );
      },
    };
  }, [database, projectId]);
}
