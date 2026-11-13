"use client";

import * as tus from "tus-js-client";

export type StreamStatus = {
  configured: boolean;
  signedPlayback: boolean;
  message: string;
};

export async function streamStatus(): Promise<StreamStatus> {
  try {
    const response = await fetch("/api/admin/stream/status", { cache: "no-store" });
    const data = await response.json();
    return {
      configured: Boolean(data.configured),
      signedPlayback: Boolean(data.signedPlayback),
      message: data.message || "",
    };
  } catch {
    return { configured: false, signedPlayback: false, message: "Could not check Stream configuration." };
  }
}

export async function uploadStreamVideo(
  file: File,
  options: { lessonId?: string; onProgress?: (percent: number) => void } = {},
): Promise<{ id: string; name: string; provider: string }> {
  const prepared = await fetch("/api/admin/stream/upload-url", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: file.name,
      sizeBytes: file.size,
      maxDurationSeconds: Math.max(600, Math.ceil(file.size / 1024 / 1024) * 12),
    }),
  });
  const start = await prepared.json();
  if (!prepared.ok) throw new Error(start.error || "Could not start the Stream upload.");

  await new Promise<void>((resolve, reject) => {
    const upload = new tus.Upload(file, {
      endpoint: start.uploadURL,
      retryDelays: [0, 2000, 5000, 10000, 20000],
      uploadSize: file.size,
      metadata: { filename: file.name, filetype: file.type || "video/mp4" },
      onError: (error) => reject(error),
      onProgress: (sent, total) => options.onProgress?.(total ? Math.round((sent / total) * 100) : 0),
      onSuccess: () => resolve(),
    });
    upload.start();
  });

  const complete = await fetch("/api/admin/stream/complete", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      uid: start.uid,
      originalName: file.name,
      sizeBytes: file.size,
      lessonId: options.lessonId || "",
    }),
  });
  const data = await complete.json();
  if (!complete.ok) throw new Error(data.error || "The video uploaded but could not be registered.");
  return data.asset;
}
