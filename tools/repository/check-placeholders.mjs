import { readdir, readFile } from "node:fs/promises";
import { extname, join, relative } from "node:path";
import process from "node:process";

const ROOT = process.cwd();
const INCLUDED_EXTENSIONS = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".mjs",
  ".py",
  ".json",
  ".jsonc",
  ".css",
  ".sql",
]);

const EXCLUDED_DIRECTORIES = new Set([
  ".git",
  ".mypy_cache",
  ".pnpm-store",
  ".pytest_cache",
  ".ruff_cache",
  ".playwright-cli",
  ".venv",
  ".wrangler",
  "coverage",
  "dist",
  "node_modules",
  "playwright-report",
  "test-results",
]);

const FORBIDDEN_PATTERNS = [
  /\bTODO\b/u,
  /\bFIXME\b/u,
  /\bHACK\b/u,
  /NotImplementedError/u,
  /throw new Error\(["']Not implemented["']\)/u,
  /@ts-ignore/u,
  /@ts-nocheck/u,
];

const ALLOWED_FILES = new Set(["tools/repository/check-placeholders.mjs"]);

async function collectFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    if (entry.isDirectory() && EXCLUDED_DIRECTORIES.has(entry.name)) {
      continue;
    }

    const absolutePath = join(directory, entry.name);

    if (entry.isDirectory()) {
      files.push(...(await collectFiles(absolutePath)));
      continue;
    }

    if (INCLUDED_EXTENSIONS.has(extname(entry.name))) {
      files.push(absolutePath);
    }
  }

  return files;
}

const violations = [];

for (const file of await collectFiles(ROOT)) {
  const relativePath = relative(ROOT, file).replaceAll("\\", "/");

  if (ALLOWED_FILES.has(relativePath)) {
    continue;
  }

  const content = await readFile(file, "utf8");
  const lines = content.split("\n");

  for (const [index, line] of lines.entries()) {
    for (const pattern of FORBIDDEN_PATTERNS) {
      if (pattern.test(line)) {
        violations.push(`${relativePath}:${index + 1}: ${line.trim()}`);
      }
    }
  }
}

if (violations.length > 0) {
  console.error("Forbidden placeholder markers found:");
  for (const violation of violations) {
    console.error(`- ${violation}`);
  }
  process.exitCode = 1;
} else {
  process.stdout.write("Placeholder scan passed.\n");
}
