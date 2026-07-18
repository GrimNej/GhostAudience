import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve, sep } from "node:path";

const blueprintPath = resolve(
  process.argv[2] ?? "GHOST_AUDIENCE_FINAL_IMPLEMENTATION_BLUEPRINT_FAQ_VERIFIED.md",
);
const force = process.argv.includes("--force");
const repositoryRoot = process.cwd();
const source = await readFile(blueprintPath, "utf8");
const filePattern = /^## FILE: `([^`]+)`\r?\n\r?\n```[^\r\n]*\r?\n(.*?)\r?\n```/gms;
const files = [...source.matchAll(filePattern)];

if (files.length !== 195) {
  throw new Error(`Expected 195 canonical files; found ${files.length}.`);
}

for (const [, relativePath, contents] of files) {
  const outputPath = resolve(repositoryRoot, relativePath);
  if (!outputPath.startsWith(`${repositoryRoot}${sep}`)) {
    throw new Error(`Refusing to write outside the repository: ${relativePath}`);
  }
  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, contents, { encoding: "utf8", flag: force ? "w" : "wx" });
}

process.stdout.write(`Extracted ${files.length} canonical files from ${blueprintPath}.\n`);
