import "server-only";

import { AwsClient } from "aws4fetch";

/**
 * Cloudflare R2 via its S3-compatible API. This works on Workers and Node,
 * keeping the application portable between local disk and object storage.
 */
const accountId = () => process.env.R2_ACCOUNT_ID || "";
const bucket = () => process.env.R2_BUCKET || "";
const accessKeyId = () => process.env.R2_ACCESS_KEY_ID || "";
const secretAccessKey = () => process.env.R2_SECRET_ACCESS_KEY || "";

export const isR2Configured = () =>
  Boolean(accountId() && bucket() && accessKeyId() && secretAccessKey());

function client() {
  return new AwsClient({
    accessKeyId: accessKeyId(),
    secretAccessKey: secretAccessKey(),
    service: "s3",
    region: process.env.R2_REGION || "auto",
  });
}

function objectUrl(key: string) {
  const encoded = key
    .split("/")
    .map((part) => encodeURIComponent(part))
    .join("/");
  return `https://${accountId()}.r2.cloudflarestorage.com/${bucket()}/${encoded}`;
}

export function r2KeyFor(folder: string, filename: string) {
  const ext = filename.includes(".") ? filename.split(".").pop()!.toLowerCase() : "bin";
  return `${folder}/${crypto.randomUUID()}.${ext}`;
}

export async function r2Put(key: string, body: Buffer | Uint8Array, contentType: string) {
  const response = await client().fetch(objectUrl(key), {
    method: "PUT",
    headers: { "Content-Type": contentType },
    body: body as unknown as BodyInit,
  });
  if (!response.ok) {
    throw new Error(`R2 upload failed (${response.status}): ${await response.text().catch(() => "")}`);
  }
}

export async function r2Get(key: string, rangeHeader?: string | null) {
  return client().fetch(objectUrl(key), {
    method: "GET",
    headers: rangeHeader ? { Range: rangeHeader } : {},
  });
}

export async function r2Head(key: string) {
  return client().fetch(objectUrl(key), { method: "HEAD" });
}

export async function r2Delete(key: string) {
  const response = await client().fetch(objectUrl(key), { method: "DELETE" });
  if (!response.ok && response.status !== 404) {
    throw new Error(`R2 delete failed (${response.status})`);
  }
}

/** Browser-direct upload URL for large videos (avoid Worker body limits). */
export async function r2PresignPut(key: string, contentType: string, expiresIn = 900) {
  const url = new URL(objectUrl(key));
  url.searchParams.set("X-Amz-Expires", String(expiresIn));
  const signed = await client().sign(url.toString(), {
    method: "PUT",
    headers: { "Content-Type": contentType },
    aws: { signQuery: true, allHeaders: true },
  });
  return {
    uploadUrl: signed.url.toString(),
    key,
    expiresIn,
    method: "PUT",
    headers: { "Content-Type": contentType },
  };
}
