export function supportsJsonObjectOutput(modelId: string): boolean {
  return modelId.startsWith("ibm/granite-") || modelId.startsWith("meta-llama/llama-");
}
