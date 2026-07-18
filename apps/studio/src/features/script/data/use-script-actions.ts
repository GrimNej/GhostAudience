import { parseScript } from "@ghost-audience/parser";
import { useMemo } from "react";
import { useDatabase } from "../../../app/database-context";
import { ProjectRepository } from "../../../infrastructure/db/project-repository";

export interface ScriptActions {
  readonly save: (title: string, text: string) => Promise<void>;
}

export function useScriptActions(projectId: string): ScriptActions {
  const database = useDatabase();
  return useMemo(() => {
    const repository = new ProjectRepository(database);
    return {
      save: async (title: string, text: string) => {
        const now = new Date().toISOString();
        const script = await parseScript({
          title,
          fileName: null,
          text,
          now,
        });
        await repository.saveScript(projectId, script);
      },
    };
  }, [database, projectId]);
}
