import { parseScript } from "@ghost-audience/parser";

import type { ProjectRepository } from "../../../infrastructure/db/project-repository";

const demoSource = `
INT. ABANDONED HOUSE - NIGHT

Mira stops at the gate before Leo shows her the address.

MIRA
Not again.

LEO
You've never been here.

Mira does not answer.

INT. KITCHEN - LATER

A photograph lies face down. Leo reaches for it.

MIRA
She said never to touch that.

Leo looks toward the empty hallway.

LEO
Your mother?

Mira shakes her head.

INT. ATTIC - NIGHT

Mira turns the photograph over. It shows her standing at the same gate as a child beside her older sister, Anya.

MIRA
Anya brought me here the night the archive burned.
`.trim();

export async function createDemoProject(
  repository: ProjectRepository,
): Promise<string> {
  const now = new Date().toISOString();
  const project = await repository.create({
    name: "The House at the Gate — Demo",
    now,
  });
  const script = await parseScript({
    title: "The House at the Gate",
    fileName: "house-at-the-gate.fountain",
    text: demoSource,
    now,
  });

  await repository.saveScript(project.id, script);

  await repository.updateIntent(
    project.id,
    {
      requiredKnowledge: [],
      desiredQuestions: [
        {
          id: "desired-recognition",
          question: "Why does Mira recognize the house?",
          openByOrdinal: 0,
          resolveByOrdinal: script.segments.length - 1,
        },
      ],
      forbiddenAssumptions: [
        {
          id: "forbid-leo-fire",
          assumption: "Leo caused the archive fire.",
          prohibitedThroughOrdinal: script.segments.length - 1,
        },
      ],
      intentionalMysteries: ["Who is the unnamed she?"],
      intendedEmotionalDirection: "Unease that becomes recognition rather than danger.",
      desiredUnresolvedQuestions: [],
    },
    now,
  );

  return project.id;
}
