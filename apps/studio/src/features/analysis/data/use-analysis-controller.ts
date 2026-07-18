import { useMemo } from "react";
import { useDatabase } from "../../../app/database-context";
import type { GhostAudienceDatabase } from "../../../infrastructure/db/database";
import { AnalysisController } from "./analysis-controller";

const controllers = new WeakMap<GhostAudienceDatabase, AnalysisController>();

function controllerFor(database: GhostAudienceDatabase): AnalysisController {
  const existing = controllers.get(database);
  if (existing !== undefined) return existing;
  const controller = new AnalysisController(database);
  controllers.set(database, controller);
  return controller;
}

export function useAnalysisController(): AnalysisController {
  const database = useDatabase();
  return useMemo(() => controllerFor(database), [database]);
}
