function bytesToHex(bytes: Uint8Array): string {
  return [...bytes]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export async function sha256(
  value: string,
): Promise<string> {
  const encoded = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest(
    "SHA-256",
    encoded,
  );

  return bytesToHex(new Uint8Array(digest));
}

export async function computePrefixHashChain(
  segmentHashes: readonly string[],
): Promise<readonly string[]> {
  const prefixHashes: string[] = [];
  let previous = await sha256(
    "ghost-audience:prefix:v1",
  );

  for (const segmentHash of segmentHashes) {
    previous = await sha256(
      `${previous}:${segmentHash}`,
    );
    prefixHashes.push(previous);
  }

  return prefixHashes;
}