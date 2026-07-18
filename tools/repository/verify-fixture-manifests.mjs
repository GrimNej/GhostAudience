import { createHash } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
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

const responseFiles = (await readdir(fixturesDirectory))
  .filter((name) => extname(name) === ".json")
  .sort();

const failures = [];

for (const fileName of responseFiles) {
  const responseBytes = await readFile(new URL(fileName, fixturesDirectory));
  const manifestName = fileName.replace(/\.json$/u, ".manifest.json");
  const manifest = JSON.parse(
    await readFile(new URL(manifestName, manifestDirectory), "utf8"),
  );

  const sha256 = createHash("sha256").update(responseBytes).digest("hex");

  if (manifest.responseSha256 !== sha256) {
    failures.push(
      `${join("responses", fileName)} expected ${manifest.responseSha256} but got ${sha256}`,
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
  console.log(`Verified ${responseFiles.length} fixture responses.`);
}