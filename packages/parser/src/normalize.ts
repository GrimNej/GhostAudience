export function normalizeScriptText(input: string): string {
  const withoutBom = input.replace(/^\uFEFF/u, "");
  const normalizedLines = withoutBom
    .normalize("NFC")
    .replaceAll("\r\n", "\n")
    .replaceAll("\r", "\n")
    .split("\n")
    .map((line) => line.replace(/[ \t]+$/gu, ""));

  return normalizedLines
    .join("\n")
    .replace(/\n{4,}/gu, "\n\n\n")
    .trim();
}

export function countWords(input: string): number {
  const matches = input.match(
    /[\p{Letter}\p{Number}\p{Mark}]+(?:['\u2019_-][\p{Letter}\p{Number}\p{Mark}]+)*/gu,
  );

  return matches?.length ?? 0;
}
