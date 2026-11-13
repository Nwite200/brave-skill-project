"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { AlertCircle, Download, Loader2, Plus, Smartphone, Trash2, Upload, X } from "lucide-react";
import { formatDate, fileSize } from "@/lib/format";

type Release = {
  id: string;
  version: string;
  versionCode: number;
  notes: string | null;
  sizeBytes: number;
  minAndroid: string;
  isActive: boolean;
  downloads: number;
  releasedAt: string;
  assetId: string | null;
};

export function ApkManager({ releases }: { releases: Release[] }) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ version: "", versionCode: 1, notes: "", minAndroid: "8.0", downloadUrl: "", assetId: "" });
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      let assetId = form.assetId;
      if (file) {
        const body = new FormData();
        body.append("file", file);
        body.append("kind", "APK");
        const upload = await fetch("/api/admin/uploads", { method: "POST", body });
        const uploadData = await upload.json();
        if (!upload.ok) throw new Error(uploadData.error || "APK upload failed.");
        assetId = uploadData.asset.id;
      }
      const res = await fetch("/api/admin/content/apk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          version: form.version,
          versionCode: form.versionCode,
          notes: form.notes,
          minAndroid: form.minAndroid,
          downloadUrl: form.downloadUrl,
          assetId,
          isActive: true,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not publish the release.");
      setOpen(false);
      setFile(null);
      setForm({ version: "", versionCode: 1, notes: "", minAndroid: "8.0", downloadUrl: "", assetId: "" });
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not publish the release.");
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id: string) => {
    setBusy(true);
    try {
      await fetch(`/api/admin/content/apk/${id}`, { method: "DELETE" });
      router.refresh();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-xl border border-white/[0.07] bg-[#0A0C15]">
      <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-3">
        <div>
          <p className="text-[11.5px] font-medium text-white">Android releases</p>
          <p className="text-[9.5px] text-[#6F7C90]">Upload a signed APK. The latest active release is served from /download.</p>
        </div>
        <button onClick={() => setOpen(true)} className="btn btn-primary btn-sm h-8"><Plus size={11} /> New release</button>
      </div>

      <div className="divide-y divide-white/[0.05]">
        {releases.map((release) => (
          <div key={release.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#10C99A]/10 text-[#10C99A]"><Smartphone size={14} /></span>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-medium text-white">Version {release.version} <span className="font-mono text-[9px] text-[#5F6B7E]">(code {release.versionCode})</span></p>
              <p className="text-[9px] text-[#5F6B7E]">{fileSize(release.sizeBytes)} · Android {release.minAndroid}+ · {release.downloads} downloads · {formatDate(release.releasedAt)}</p>
            </div>
            <span className={`rounded-full border px-1.5 py-0.5 text-[8px] uppercase ${release.isActive ? "border-emerald-400/20 text-emerald-300" : "border-white/10 text-[#6F7C90]"}`}>{release.isActive ? "Active" : "Inactive"}</span>
            {release.assetId && <a href={`/api/media/${release.assetId}`} className="flex h-6 w-6 items-center justify-center rounded border border-white/10 text-[#8492A6] hover:text-white" title="Asset"><Download size={10} /></a>}
            <button onClick={() => remove(release.id)} disabled={busy} className="flex h-6 w-6 items-center justify-center rounded border border-white/10 text-[#8492A6] hover:text-rose-300"><Trash2 size={10} /></button>
          </div>
        ))}
        {!releases.length && <p className="px-4 py-6 text-center text-[10.5px] text-[#6F7C90]">No Android releases yet. The website will show “build coming soon”.</p>}
      </div>

      {open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
          <form onSubmit={submit} className="w-full max-w-md rounded-2xl border border-white/[0.1] bg-[#0A0C15] p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-[13px] font-semibold text-white">Publish Android release</h2>
              <button type="button" onClick={() => setOpen(false)} className="text-[#6F7C90] hover:text-white"><X size={15} /></button>
            </div>
            {error && <p className="mt-3 flex items-center gap-1.5 rounded-lg border border-rose-400/20 bg-rose-500/10 px-2.5 py-2 text-[10px] text-rose-200"><AlertCircle size={11} /> {error}</p>}
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div><label className="label">Version name</label><input required className="field h-9 text-[11px]" placeholder="1.0.0" value={form.version} onChange={(e) => setForm({ ...form, version: e.target.value })} /></div>
              <div><label className="label">Version code</label><input required type="number" min={1} className="field h-9 text-[11px]" value={form.versionCode} onChange={(e) => setForm({ ...form, versionCode: Number(e.target.value) })} /></div>
              <div><label className="label">Minimum Android</label><input className="field h-9 text-[11px]" value={form.minAndroid} onChange={(e) => setForm({ ...form, minAndroid: e.target.value })} /></div>
              <div><label className="label">External URL (optional)</label><input className="field h-9 text-[11px]" placeholder="https://…" value={form.downloadUrl} onChange={(e) => setForm({ ...form, downloadUrl: e.target.value })} /></div>
            </div>
            <div className="mt-3">
              <label className="label">APK file</label>
              <input ref={fileRef} type="file" accept=".apk,application/vnd.android.package-archive" className="hidden" onChange={(e) => setFile(e.target.files?.[0] || null)} />
              <button type="button" onClick={() => fileRef.current?.click()} className="flex w-full items-center justify-between rounded-lg border border-dashed border-white/15 px-3 py-2.5 text-[10px] text-[#8492A6] hover:border-[#873BFF]/40 hover:text-white">
                <span className="flex items-center gap-2"><Upload size={12} /> {file ? file.name : "Choose signed APK"}</span>
                {file && <span className="text-[9px] text-[#5F6B7E]">{fileSize(file.size)}</span>}
              </button>
            </div>
            <div className="mt-3"><label className="label">Release notes</label><textarea rows={2} className="field text-[11px]" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" onClick={() => setOpen(false)} className="btn btn-ghost btn-sm h-9">Cancel</button>
              <button type="submit" disabled={busy} className="btn btn-primary btn-sm h-9">{busy ? <Loader2 size={12} className="animate-spin" /> : "Publish"}</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
