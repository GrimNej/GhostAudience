export function nowMilliseconds(): number {
  return Date.now();
}

export function elapsedMilliseconds(
  startedAt: number,
): number {
  return Date.now() - startedAt;
}