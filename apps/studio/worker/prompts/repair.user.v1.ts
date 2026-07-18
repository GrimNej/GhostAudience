export function buildRepairUserPrompt(
  malformedResponse: string,
  validationError: string,
): string {
  return JSON.stringify(
    {
      task: "repair_json_only",
      validationError: validationError.slice(0, 4_000),
      malformedResponse: malformedResponse.slice(0, 20_000),
    },
    null,
    2,
  );
}
