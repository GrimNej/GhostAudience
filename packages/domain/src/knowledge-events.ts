import type { AudienceAssumption, AudienceFact } from "./audience-state.js";
import type { EvidenceSpan } from "./evidence.js";

export type KnowledgeEvent =
  | { readonly operationId: string; readonly type: "FACT_ADDED"; readonly fact: AudienceFact }
  | { readonly operationId: string; readonly type: "FACT_SUPERSEDED"; readonly factId: string; readonly supersededByFactId: string }
  | { readonly operationId: string; readonly type: "ASSUMPTION_ADDED"; readonly assumption: AudienceAssumption }
  | { readonly operationId: string; readonly type: "ASSUMPTION_CONFIRMED" | "ASSUMPTION_REFUTED" | "ASSUMPTION_EXPIRED"; readonly assumptionId: string; readonly evidence: readonly EvidenceSpan[]; readonly rationale: string };

export function applyKnowledgeEvents(
  facts: readonly AudienceFact[],
  assumptions: readonly AudienceAssumption[],
  events: readonly KnowledgeEvent[],
): { readonly facts: readonly AudienceFact[]; readonly assumptions: readonly AudienceAssumption[] } {
  const factMap = new Map(facts.map((fact) => [fact.id, fact]));
  const assumptionMap = new Map(assumptions.map((assumption) => [assumption.id, assumption]));

  for (const event of events) {
    switch (event.type) {
      case "FACT_ADDED":
        if (factMap.has(event.fact.id)) throw new Error(`Fact ID collision: ${event.fact.id}.`);
        factMap.set(event.fact.id, event.fact);
        break;
      case "FACT_SUPERSEDED": {
        const existing = factMap.get(event.factId);
        if (existing === undefined || !factMap.has(event.supersededByFactId)) throw new Error("Invalid fact supersession event.");
        factMap.set(event.factId, { ...existing, supersededByFactId: event.supersededByFactId });
        break;
      }
      case "ASSUMPTION_ADDED":
        if (assumptionMap.has(event.assumption.id)) throw new Error(`Assumption ID collision: ${event.assumption.id}.`);
        assumptionMap.set(event.assumption.id, event.assumption);
        break;
      case "ASSUMPTION_CONFIRMED":
      case "ASSUMPTION_REFUTED":
      case "ASSUMPTION_EXPIRED": {
        const existing = assumptionMap.get(event.assumptionId);
        if (existing === undefined) throw new Error(`Unknown assumption ${event.assumptionId}.`);
        const status = event.type === "ASSUMPTION_CONFIRMED" ? "confirmed" : event.type === "ASSUMPTION_REFUTED" ? "refuted" : "expired";
        assumptionMap.set(event.assumptionId, { ...existing, status, evidence: [...existing.evidence, ...event.evidence] });
        break;
      }
    }
  }

  return { facts: [...factMap.values()], assumptions: [...assumptionMap.values()] };
}