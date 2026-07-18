import type { MiddlewareHandler } from "hono";
import type { Bindings, RuntimeConfig } from "../env";

interface Variables {
  readonly runtimeConfig: RuntimeConfig;
  readonly anonymousSessionId: string;
}

type Environment = { readonly Bindings: Bindings; readonly Variables: Variables };
const COOKIE_NAME = "ad_session";
const MAX_AGE_SECONDS = 86_400;

function bytesToHex(bytes: Uint8Array): string {
  return [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function hmacHex(secret: string, value: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(value),
  );
  return bytesToHex(new Uint8Array(signature));
}

function parseCookieHeader(header: string | undefined): ReadonlyMap<string, string> {
  const values = new Map<string, string>();
  for (const part of (header ?? "").split(";")) {
    const index = part.indexOf("=");
    if (index <= 0) continue;
    values.set(part.slice(0, index).trim(), part.slice(index + 1).trim());
  }
  return values;
}

async function verifySession(
  value: string | undefined,
  secret: string,
): Promise<string | null> {
  if (value === undefined) return null;
  const [sessionId, expiresText, signature] = value.split(".");
  if (sessionId === undefined || expiresText === undefined || signature === undefined)
    return null;
  const expires = Number.parseInt(expiresText, 10);
  if (!Number.isFinite(expires) || expires <= Math.floor(Date.now() / 1000))
    return null;
  const expected = await hmacHex(secret, `${sessionId}.${expiresText}`);
  if (expected.length !== signature.length) return null;
  let difference = 0;
  for (let index = 0; index < expected.length; index += 1) {
    difference |= expected.charCodeAt(index) ^ signature.charCodeAt(index);
  }
  return difference === 0 ? sessionId : null;
}

export const anonymousSessionMiddleware: MiddlewareHandler<Environment> = async (
  context,
  next,
) => {
  const config = context.get("runtimeConfig");
  const cookies = parseCookieHeader(context.req.header("cookie"));
  let sessionId = await verifySession(
    cookies.get(COOKIE_NAME),
    config.sessionSigningSecret,
  );

  if (sessionId === null) {
    sessionId = crypto.randomUUID();
    const expires = Math.floor(Date.now() / 1000) + MAX_AGE_SECONDS;
    const payload = `${sessionId}.${expires}`;
    const signature = await hmacHex(config.sessionSigningSecret, payload);
    context.header(
      "set-cookie",
      `${COOKIE_NAME}=${payload}.${signature}; Max-Age=${MAX_AGE_SECONDS}; Path=/; HttpOnly; Secure; SameSite=Strict`,
      { append: true },
    );
  }

  context.set("anonymousSessionId", sessionId);
  await next();
};
