import { useMemo } from "react";
import { useDatabase } from "../../../app/database-context";
import { AnalysisController } from "./analysis-controller";

export function useAnalysisController(): AnalysisController {
  const database = useDatabase();
  return useMemo(() => new AnalysisController(database), [database]);
}
