const DIACRITIC_MARKS = /\p{Mark}+/gu;
const NON_ALPHANUMERIC = /[^\p{Letter}\p{Number}|]+/gu;
const REPEATED_SEPARATOR = /\|+/gu;

export function normalizeSemanticKey(value: string): string {
  return value
    .normalize("NFKD")
    .replace(DIACRITIC_MARKS, "")
    .toLocaleLowerCase("en-US")
    .replace(NON_ALPHANUMERIC, "-")
    .replace(REPEATED_SEPARATOR, "|")
    .replace(/^-+|-+$/gu, "")
    .replace(/\|-+|-+\|/gu, "|");
}

function tokenSet(value: string): ReadonlySet<string> {
  return new Set(
    normalizeSemanticKey(value)
      .split(/[|-]/u)
      .filter((token) => token.length > 1),
  );
}

export function jaccardSimilarity(left: string, right: string): number {
  const leftTokens = tokenSet(left);
  const rightTokens = tokenSet(right);

  if (leftTokens.size === 0 && rightTokens.size === 0) {
    return 1;
  }

  const union = new Set([...leftTokens, ...rightTokens]);
  let intersectionCount = 0;

  for (const token of leftTokens) {
    if (rightTokens.has(token)) {
      intersectionCount += 1;
    }
  }

  return intersectionCount / union.size;
}

export function areLikelyDuplicateQuestions(
  leftSemanticKey: string,
  rightSemanticKey: string,
  threshold = 0.8,
): boolean {
  const left = normalizeSemanticKey(leftSemanticKey);
  const right = normalizeSemanticKey(rightSemanticKey);

  if (left === right) {
    return true;
  }

  const [leftKind] = left.split("|");
  const [rightKind] = right.split("|");

  if (leftKind !== rightKind) {
    return false;
  }

  return jaccardSimilarity(left, right) >= threshold;
}
