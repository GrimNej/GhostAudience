import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import { extname, join } from "node:path";
import process from "node:process";

const fixturesDirectory = new URL(
  "../../packages/test-fixtures/responses/",
  import.meta.url,
);

const manifestDirectory = new URL(
  "../../packages/test-fixtures/manifests/",
  import.meta.url,
);

const inputDirectory = new URL("../../packages/test-fixtures/inputs/", import.meta.url);

const responseFiles = (await readdir(fixturesDirectory))
  .filter((name) => extname(name) === ".json")
  .sort();

const failures = [];

for (const fileName of responseFiles) {
  const responseBytes = await readFile(new URL(fileName, fixturesDirectory));
  const manifestName = fileName.replace(/\.json$/u, ".manifest.json");
  const inputName = fileName.replace(/\.json$/u, ".input.json");
  const manifest = JSON.parse(
    await readFile(new URL(manifestName, manifestDirectory), "utf8"),
  );

  const inputBytes = await readFile(new URL(inputName, inputDirectory));
  const inputSha256 = createHash("sha256").update(inputBytes).digest("hex");

  const sha256 = createHash("sha256").update(responseBytes).digest("hex");

  if (manifest.responseSha256 !== sha256) {
    failures.push(
      `${join("responses", fileName)} expected ${manifest.responseSha256} but got ${sha256}`,
    );
  }

  if (manifest.inputSha256 !== inputSha256) {
    failures.push(
      `${join("inputs", inputName)} expected ${manifest.inputSha256} but got ${inputSha256}`,
    );
  }

  if (manifest.mode !== "fixture") {
    failures.push(`${manifestName} must declare mode=fixture`);
  }
}

if (failures.length > 0) {
  console.error("Fixture verification failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exitCode = 1;
} else {
  process.stdout.write(`Verified ${responseFiles.length} fixture responses.\n`);
}
