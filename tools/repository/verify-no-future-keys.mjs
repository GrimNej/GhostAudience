import { readFile } from "node:fs/promises";
import process from "node:process";

const contractPath = new URL(
  "../../packages/contracts/src/step-analysis.ts",
  import.meta.url,
);

const source = await readFile(contractPath, "utf8");

const forbiddenKeys = [
  "fullScript",
  "remainingSegments",
  "nextSegment",
  "ending",
  "globalSummary",
  "futureCharacters",
];

const violations = forbiddenKeys.filter((key) =>
  new RegExp(`\\b${key}\\b`, "u").test(source),
);

if (violations.length > 0) {
  console.error(
    `No-hindsight contract contains forbidden keys: ${violations.join(", ")}`,
  );
  process.exitCode = 1;
} else {
  process.stdout.write("No-hindsight request-key scan passed.\n");
}
