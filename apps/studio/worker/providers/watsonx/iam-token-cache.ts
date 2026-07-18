import { ApiError } from "../../errors";
import { IamTokenResponseSchema } from "./watsonx-schemas";

interface CachedToken { readonly value: string; readonly expiresAtEpochSeconds: number; }
let cachedToken: CachedToken | null = null;
let inFlightTokenRequest: Promise<CachedToken> | null = null;
const REFRESH_SKEW_SECONDS = 300;

function tokenIsFresh(token: CachedToken): boolean {
  return token.expiresAtEpochSeconds - REFRESH_SKEW_SECONDS > Math.floor(Date.now() / 1000);
}

async function requestToken(apiKey: string): Promise<CachedToken> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10_000);
  try {
    const response = await fetch("https://iam.cloud.ibm.com/identity/token", {
      method: "POST",
      headers: { accept: "application/json", "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ grant_type: "urn:ibm:params:oauth:grant-type:apikey", apikey: apiKey }),
      signal: controller.signal,
    });
    if (!response.ok) throw new ApiError("PROVIDER_AUTH_FAILED", 502, "IBM IAM authentication failed.", false);
    const parsed = IamTokenResponseSchema.parse(await response.json());
    return { value: parsed.access_token, expiresAtEpochSeconds: parsed.expiration };
  } finally {
    clearTimeout(timer);
  }
}

export async function getIamToken(apiKey: string): Promise<string> {
  if (cachedToken !== null && tokenIsFresh(cachedToken)) return cachedToken.value;
  if (inFlightTokenRequest === null) {
    inFlightTokenRequest = requestToken(apiKey).finally(() => { inFlightTokenRequest = null; });
  }
  cachedToken = await inFlightTokenRequest;
  return cachedToken.value;
}

export function invalidateIamToken(): void { cachedToken = null; }
export function clearIamTokenCacheForTest(): void { cachedToken = null; inFlightTokenRequest = null; }