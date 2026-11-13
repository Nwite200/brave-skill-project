export type UploadedAsset = {
  id: string;
  kind: string;
  name: string;
  size: number;
  mime: string;
  url?: string;
};

/**
 * Uploads through the Worker for small files, or directly to R2 using a
 * presigned PUT for large media. The direct path avoids Cloudflare's request
 * body limit and keeps large course videos off the application server.
 */
export async function uploadAsset(file: File, kind: "VIDEO" | "PDF" | "IMAGE" | "APK"): Promise<UploadedAsset> {
  const large = file.size > 70 * 1024 * 1024;

  if (large) {
    const presign = await fetch("/api/admin/uploads/presign", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        filename: file.name,
        kind,
        mimeType: file.type || "application/octet-stream",
        sizeBytes: file.size,
      }),
    });
    const presigned = await presign.json();
    if (presign.ok) {
      const put = await fetch(presigned.uploadUrl, {
        method: "PUT",
        headers: presigned.headers,
        body: file,
      });
      if (!put.ok) throw new Error(`Direct upload failed (${put.status}). Check the R2 CORS policy.`);
      const complete = await fetch("/api/admin/uploads/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key: presigned.key,
          kind,
          originalName: file.name,
          mimeType: file.type || "application/octet-stream",
          sizeBytes: file.size,
        }),
      });
      const asset = await complete.json();
      if (!complete.ok) throw new Error(asset.error || "Could not register the uploaded file.");
      return asset.asset as UploadedAsset;
    }
    if (presign.status !== 501) throw new Error(presigned.error || "Could not prepare the upload.");
    // R2 not configured: fall through to the regular upload (Node hosting).
  }

  const body = new FormData();
  body.append("file", file);
  body.append("kind", kind);
  const response = await fetch("/api/admin/uploads", { method: "POST", body });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Upload failed.");
  return data.asset as UploadedAsset;
}
