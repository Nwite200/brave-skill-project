"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, Film, Loader2, Trash2, Upload } from "lucide-react";
import { uploadLessonVideo } from "@/components/admin/upload";
import { streamStatus, type StreamStatus } from "@/components/admin/stream";
import { fileSize, formatDuration, formatDate } from "@/lib/format";

type VideoRow = {
  id: string;
  provider: string;
  externalId: string | null;
  name: string;
  status: string;
  sizeBytes: number;
  durationSec: number;
  createdAt: string;
  lessons: { id: string; title: string; course: string }[];
};

export function VideoLibrary({
  videos,
  lessons,
}: {
  videos: VideoRow[];
  lessons: { id: string; label: string }[];
}) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [status, setStatus] = useState<StreamStatus | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [lessonId, setLessonId] = useState("");
  const [progress, setProgress] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    streamStatus().then(setStatus);
  }, []);

  const upload = async () => {
    if (!file) return;
    setBusy(true);
    setError("");
    setSuccess("");
    setProgress(0);
    try {
      const asset = await uploadLessonVideo(file, { onProgress: setProgress });
      if (lessonId) {
        const attach = await fetch("/api/admin/videos/attach", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ assetId: asset.id, lessonId }),
        });
        const data = await attach.json();
        if (!attach.ok) throw new Error(data.error || "Video uploaded but could not be attached.");
      }
      setSuccess("Video uploaded successfully.");
      setFile(null);
      setLessonId("");
      if (fileRef.current) fileRef.current.value = "";
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      setBusy(false);
      setProgress(0);
    }
  };

  const remove = async (video: VideoRow) => {
    if (!confirm(`Delete “${video.name}” from the video library? Lessons using it will lose the video.`)) return;
    setBusy(true);
    setError("");
    try {
      const endpoint = video.provider === "cloudflare-stream" && video.externalId
        ? `/api/admin/stream/${video.externalId}`
        : `/api/admin/assets/${video.id}`;
      const response = await fetch(endpoint, { method: "DELETE" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not delete the video.");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not delete the video.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-[1180px]">
      <div>
        <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-[#455063]">Academy / video library</p>
        <h1 className="mt-1.5 text-[22px] font-semibold tracking-[-0.03em] text-white">Video library</h1>
        <p className="mt-1 text-[11.5px] text-[#8492A6]">Upload, replace and manage protected course videos.</p>
      </div>

      {status && !status.configured && (
        <div className="mt-4 flex items-start gap-3 rounded-xl border border-amber-400/25 bg-amber-500/[0.07] p-4">
          <AlertTriangle size={16} className="mt-0.5 shrink-0 text-amber-300" />
          <div>
            <p className="text-[11.5px] font-medium text-amber-200">Cloudflare Stream is not activated</p>
            <p className="mt-1 text-[10px] leading-relaxed text-amber-200/70">
              Uploads currently use private local/R2 storage and remain protected by enrolment checks. Cloudflare
              Stream (resumable uploads, signed playback, watermarking and DRM) will activate only after the owner
              approves the service and adds the server-side credentials. No paid service is called by this screen.
            </p>
          </div>
        </div>
      )}

      {status?.configured && (
        <div className="mt-4 flex items-center gap-2 rounded-xl border border-emerald-400/20 bg-emerald-500/[0.06] p-3 text-[10.5px] text-emerald-200">
          <CheckCircle2 size={13} /> Cloudflare Stream connected. Uploads are resumable; playback uses signed tokens.
        </div>
      )}

      <div className="mt-4 rounded-xl border border-white/[0.07] bg-[#0A0C15] p-4">
        <div className="flex items-center gap-2">
          <Upload size={14} className="text-[#C9B8FF]" />
          <p className="text-[12px] font-medium text-white">Upload a video</p>
        </div>
        <p className="mt-1 text-[9.5px] text-[#6F7C90]">
          {status?.configured
            ? "Direct-to-Cloudflare Stream with resumable transfer and progress."
            : "Private local/R2 upload. Enable Stream later for signed playback and DRM."}
        </p>
        <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
          <input ref={fileRef} type="file" accept="video/mp4,video/webm" className="hidden" onChange={(e) => setFile(e.target.files?.[0] || null)} />
          <button type="button" onClick={() => fileRef.current?.click()} className="flex h-10 items-center gap-2 rounded-lg border border-dashed border-white/15 px-3 text-left text-[11px] text-[#A9B4C6] hover:border-[#873BFF]/40">
            <Film size={13} /> {file ? `${file.name} (${fileSize(file.size)})` : "Choose video file"}
          </button>
          <select className="field h-10 text-[11px]" value={lessonId} onChange={(e) => setLessonId(e.target.value)}>
            <option value="">Upload only (attach later)</option>
            {lessons.map((lesson) => <option key={lesson.id} value={lesson.id}>{lesson.label}</option>)}
          </select>
          <button onClick={upload} disabled={!file || busy} className="btn btn-primary btn-sm h-10">
            {busy ? <><Loader2 size={13} className="animate-spin" /> {progress}%</> : "Upload"}
          </button>
        </div>
        {busy && (
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/[0.07]">
            <div className="h-full rounded-full bg-gradient-to-r from-[#873BFF] to-[#20D9E8] transition-all" style={{ width: `${progress}%` }} />
          </div>
        )}
        {error && <p className="mt-3 rounded-lg border border-rose-400/20 bg-rose-500/10 px-3 py-2 text-[10.5px] text-rose-200">{error}</p>}
        {success && <p className="mt-3 rounded-lg border border-emerald-400/20 bg-emerald-500/10 px-3 py-2 text-[10.5px] text-emerald-200">{success}</p>}
      </div>

      <div className="mt-4 table-wrap">
        <table className="data">
          <thead>
            <tr><th>Video</th><th>Provider</th><th>Status</th><th>Duration</th><th>Size</th><th>Used in</th><th>Uploaded</th><th className="text-right">Delete</th></tr>
          </thead>
          <tbody>
            {videos.map((video) => (
              <tr key={video.id}>
                <td className="max-w-[260px] truncate text-white">{video.name}</td>
                <td><span className={`rounded-full border px-1.5 py-0.5 text-[8px] uppercase ${video.provider === "cloudflare-stream" ? "border-[#20D9E8]/25 text-[#7FE9F2]" : "border-white/10 text-[#8492A6]"}`}>{video.provider === "cloudflare-stream" ? "Stream" : "Private"}</span></td>
                <td className="text-[10px]">{video.status}</td>
                <td className="text-[10px]">{formatDuration(video.durationSec)}</td>
                <td className="text-[10px]">{fileSize(video.sizeBytes)}</td>
                <td className="max-w-[220px]">
                  {video.lessons.length ? (
                    <span className="block truncate text-[10px] text-[#C2CCDD]" title={video.lessons.map((l) => `${l.course} · ${l.title}`).join(", ")}>
                      {video.lessons[0].course} · {video.lessons[0].title}{video.lessons.length > 1 ? ` +${video.lessons.length - 1}` : ""}
                    </span>
                  ) : <span className="text-[9px] text-[#5F6B7E]">Unassigned</span>}
                </td>
                <td className="text-[9.5px] text-[#6F7C90]">{formatDate(video.createdAt)}</td>
                <td className="text-right">
                  <button onClick={() => remove(video)} disabled={busy} className="flex h-7 w-7 items-center justify-center rounded-md border border-white/10 text-[#8492A6] hover:border-rose-400/40 hover:text-rose-300">
                    <Trash2 size={11} />
                  </button>
                </td>
              </tr>
            ))}
            {!videos.length && <tr><td colSpan={8} className="py-12 text-center text-[11px] text-[#6F7C90]">No videos yet. Upload your first lesson video above.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
