import "server-only";

import { SignJWT, importPKCS8 } from "jose";

/**
 * Cloudflare Stream adapter.
 *
 * NOT ACTIVATED BY DEFAULT. The academy can enable it by supplying the account
 * ID, API token, customer code and signing key. Until then all video features
 * continue to use private local/R2 storage. No paid service is called unless
 * these variables exist, and the API token is never sent to the browser.
 */

export const streamSettings = () => ({
  accountId: process.env.CLOUDFLARE_ACCOUNT_ID?.trim() || "",
  apiToken: process.env.CLOUDFLARE_STREAM_API_TOKEN?.trim() || "",
  customerCode: process.env.CLOUDFLARE_STREAM_CUSTOMER_CODE?.trim() || "",
  signingKeyId: process.env.CLOUDFLARE_STREAM_SIGNING_KEY_ID?.trim() || "",
  signingKey: process.env.CLOUDFLARE_STREAM_SIGNING_KEY?.trim() || "",
});

export const isStreamConfigured = () => {
  const { accountId, apiToken, customerCode } = streamSettings();
  return Boolean(accountId && apiToken && customerCode);
};

export const isStreamSigningConfigured = () => {
  const { signingKeyId, signingKey } = streamSettings();
  return Boolean(signingKeyId && signingKey);
};

async function streamApi(path: string, init?: RequestInit) {
  const { accountId, apiToken } = streamSettings();
  if (!accountId || !apiToken) throw new Error("Cloudflare Stream is not configured.");
  const response = await fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}/stream${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${apiToken}`,
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
    cache: "no-store",
  });
  const payload = (await response.json().catch(() => ({}))) as {
    success?: boolean;
    errors?: { message?: string }[];
    result?: Record<string, unknown>;
  };
  if (!response.ok || payload.success === false) {
    console.error("[stream]", path, response.status, payload);
    throw new Error(payload.errors?.[0]?.message || "Cloudflare Stream request failed.");
  }
  return payload.result || {};
}

export async function createStreamDirectUpload(input: { name: string; maxDurationSeconds?: number }) {
  const result = await streamApi("/direct_upload", {
    method: "POST",
    body: JSON.stringify({
      maxDurationSeconds: Math.max(60, input.maxDurationSeconds || 7200),
      meta: { name: input.name },
      requireSignedURLs: true,
      creator: "Brave Skill Academy",
    }),
  });
  const uid = result.uid as string;
  const uploadURL = result.uploadURL as string;
  if (!uid || !uploadURL) throw new Error("Cloudflare Stream did not return an upload URL.");
  return { uid, uploadURL };
}

export async function getStreamVideo(uid: string) {
  return streamApi(`/${encodeURIComponent(uid)}`);
}

export async function deleteStreamVideo(uid: string) {
  await streamApi(`/${encodeURIComponent(uid)}`, { method: "DELETE" });
}

export async function signStreamToken(uid: string, ttlSeconds = 3600) {
  const { signingKeyId, signingKey } = streamSettings();
  if (!signingKeyId || !signingKey) {
    throw new Error("Signed playback is not configured. Add the Cloudflare Stream signing key id and key.");
  }
  const pem = signingKey.includes("BEGIN")
    ? signingKey.replace(/\\n/g, "\n")
    : Buffer.from(signingKey, "base64").toString("utf8");
  const key = await importPKCS8(pem, "RS256");
  return new SignJWT({ sub: uid, kid: signingKeyId })
    .setProtectedHeader({ alg: "RS256", kid: signingKeyId })
    .setIssuedAt()
    .setExpirationTime(`${ttlSeconds}s`)
    .sign(key);
}

export function streamIframeUrl(uid: string, token: string) {
  const { customerCode } = streamSettings();
  if (!customerCode) throw new Error("Cloudflare Stream customer code is missing.");
  return `https://customer-${customerCode}.cloudflarestream.com/${encodeURIComponent(uid)}/iframe?token=${encodeURIComponent(token)}`;
}
