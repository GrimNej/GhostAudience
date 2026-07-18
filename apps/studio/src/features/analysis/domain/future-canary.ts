export interface CanaryInspection {
  readonly found: boolean;
  readonly paths: readonly string[];
}

export function inspectForFutureCanary(
  value: unknown,
  canary: string,
): CanaryInspection {
  const paths: string[] = [];

  visit(value, "$", canary, paths);

  return {
    found: paths.length > 0,
    paths,
  };
}

function visit(
  value: unknown,
  path: string,
  canary: string,
  paths: string[],
): void {
  if (typeof value === "string") {
    if (value.includes(canary)) {
      paths.push(path);
    }

    return;
  }

  if (Array.isArray(value)) {
    for (const [index, item] of value.entries()) {
      visit(
        item,
        `${path}[${index}]`,
        canary,
        paths,
      );
    }

    return;
  }

  if (value === null || typeof value !== "object") {
    return;
  }

  for (const [key, nested] of Object.entries(value)) {
    visit(nested, `${path}.${key}`, canary, paths);
  }
}