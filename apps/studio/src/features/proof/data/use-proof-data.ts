import { useLiveQuery } from "dexie-react-hooks";
import { useDatabase } from "../../../app/database-context";
import { WorkspaceReadRepository } from "../../../infrastructure/db/workspace-read-repository";
import { buildProofMetrics } from "../domain/proof-metrics";

export function useProofData() {
  const database = useDatabase();
  return useLiveQuery(
    async () => {
      const runs = await database.runs.orderBy("updatedAt").reverse().toArray();
      const run = runs[0];
      if (run === undefined) return null;
      const reads = new WorkspaceReadRepository(database);
      const [script, questions, proof] = await Promise.all([
        reads.scriptDocument(run.scriptId),
        reads.questions(run.id),
        reads.proofData(run),
      ]);
      return buildProofMetrics({
        run,
        segmentCount: script.segments.length,
        questions,
        ...proof,
      });
    },
    [database],
    undefined,
  );
}
