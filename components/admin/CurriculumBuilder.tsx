"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import {
  AlertCircle,
  ChevronDown,
  FileText,
  GraduationCap,
  Loader2,
  Pencil,
  PlayCircle,
  Plus,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { formatDuration } from "@/lib/format";
import { uploadAsset, uploadLessonVideo } from "@/components/admin/upload";

type LessonRow = {
  id: string;
  title: string;
  type: "VIDEO" | "PDF" | "TEXT";
  durationSeconds: number;
  isPreview: boolean;
  isPublished: boolean;
  videoAssetId: string | null;
  pdfAssetId: string | null;
  videoUrl: string | null;
  content: string | null;
  description: string | null;
  videoName?: string | null;
  pdfName?: string | null;
};

type ModuleRow = {
  id: string;
  title: string;
  description: string | null;
  position: number;
  isPublished: boolean;
  lessons: LessonRow[];
};

type QuizRow = {
  id: string;
  title: string;
  type: "QUIZ" | "EXAM";
  passMark: number;
  questions: number;
  isPublished: boolean;
};

const emptyLesson = {
  id: "",
  title: "",
  type: "VIDEO" as LessonRow["type"],
  durationMinutes: 0,
  isPreview: false,
  isPublished: true,
  videoAssetId: "",
  pdfAssetId: "",
  videoUrl: "",
  content: "",
  description: "",
};

export function CurriculumBuilder({
  courseId,
  modules,
  quizzes,
}: {
  courseId: string;
  modules: ModuleRow[];
  quizzes: QuizRow[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [moduleModal, setModuleModal] = useState<{ open: boolean; id?: string; title: string; description: string }>({ open: false, title: "", description: "" });
  const [lessonModal, setLessonModal] = useState<{ open: boolean; moduleId: string; values: typeof emptyLesson }>({ open: false, moduleId: "", values: emptyLesson });
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [deleteTarget, setDeleteTarget] = useState<{ type: "module" | "lesson"; id: string; title: string } | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [openModules, setOpenModules] = useState<Record<string, boolean>>(
    Object.fromEntries(modules.map((m) => [m.id, true])),
  );

  const call = async (url: string, method: string, body?: unknown) => {
    const res = await fetch(url, {
      method,
      ...(body ? { headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) } : {}),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "Request failed.");
    return data;
  };

  const saveModule = async () => {
    setBusy("module");
    setError("");
    try {
      await call(`/api/admin/content/modules${moduleModal.id ? `/${moduleModal.id}` : ""}`, moduleModal.id ? "PATCH" : "POST", {
        courseId,
        title: moduleModal.title,
        description: moduleModal.description,
        position: moduleModal.id ? modules.find((m) => m.id === moduleModal.id)?.position ?? modules.length : modules.length,
        isPublished: true,
      });
      setModuleModal({ open: false, title: "", description: "" });
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save module.");
    } finally {
      setBusy(null);
    }
  };

  const openLesson = (moduleId: string, lesson?: LessonRow) => {
    if (lesson) {
      setLessonModal({
        open: true,
        moduleId,
        values: {
          id: lesson.id,
          title: lesson.title,
          type: lesson.type,
          durationMinutes: Math.round(lesson.durationSeconds / 60),
          isPreview: lesson.isPreview,
          isPublished: lesson.isPublished,
          videoAssetId: lesson.videoAssetId || "",
          pdfAssetId: lesson.pdfAssetId || "",
          videoUrl: lesson.videoUrl || "",
          content: lesson.content || "",
          description: lesson.description || "",
        },
      });
    } else {
      setLessonModal({ open: true, moduleId, values: { ...emptyLesson } });
    }
  };

  const uploadFile = async (file: File, kind: "VIDEO" | "PDF") => {
    setUploading(true);
    setUploadProgress(0);
    setError("");
    try {
      const asset = kind === "VIDEO"
        ? await uploadLessonVideo(file, { onProgress: setUploadProgress })
        : await uploadAsset(file, kind);
      setLessonModal((prev) => ({
        ...prev,
        values: {
          ...prev.values,
          ...(kind === "VIDEO" ? { videoAssetId: asset.id, type: "VIDEO" as const } : { pdfAssetId: asset.id }),
        },
      }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const saveLesson = async () => {
    const v = lessonModal.values;
    setBusy("lesson");
    setError("");
    try {
      const module = modules.find((m) => m.id === lessonModal.moduleId);
      await call(`/api/admin/content/lessons${v.id ? `/${v.id}` : ""}`, v.id ? "PATCH" : "POST", {
        moduleId: lessonModal.moduleId,
        title: v.title,
        description: v.description,
        type: v.type,
        durationSeconds: v.durationMinutes * 60,
        videoAssetId: v.type === "VIDEO" ? v.videoAssetId || "" : "",
        pdfAssetId: v.type === "PDF" ? v.pdfAssetId || "" : "",
        videoUrl: v.videoUrl || "",
        content: v.content || "",
        position: v.id
          ? Math.max(0, module?.lessons.findIndex((l) => l.id === v.id) ?? 0)
          : module?.lessons.length ?? 0,
        isPreview: v.isPreview,
        isPublished: v.isPublished,
      });
      setLessonModal({ open: false, moduleId: "", values: { ...emptyLesson } });
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save lesson.");
    } finally {
      setBusy(null);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setBusy("delete");
    setError("");
    try {
      await call(`/api/admin/content/${deleteTarget.type === "module" ? "modules" : "lessons"}/${deleteTarget.id}`, "DELETE");
      setDeleteTarget(null);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not delete.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div id="curriculum" className="mx-auto mt-8 max-w-[1180px] scroll-mt-24">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-[#455063]">Curriculum</p>
          <h2 className="mt-1 text-[18px] font-semibold tracking-[-0.02em] text-white">Modules & lessons</h2>
          <p className="mt-1 text-[10.5px] text-[#7C8AA3]">Upload videos and PDFs or link hosted media. Learners see changes immediately.</p>
        </div>
        <div className="flex gap-2">
          <Link href={`/admin/examinations?course=${courseId}`} className="btn btn-ghost btn-sm h-8"><GraduationCap size={12} /> Assessments</Link>
          <button onClick={() => setModuleModal({ open: true, title: "", description: "" })} className="btn btn-primary btn-sm h-8"><Plus size={12} /> Add module</button>
        </div>
      </div>

      {error && <p className="mt-3 flex items-start gap-2 rounded-lg border border-rose-400/20 bg-rose-500/10 px-3 py-2 text-[11px] text-rose-200"><AlertCircle size={12} className="mt-0.5 shrink-0" /> {error}</p>}

      <div className="mt-4 space-y-3">
        {modules.map((module, index) => (
          <div key={module.id} className="overflow-hidden rounded-xl border border-white/[0.07] bg-[#0A0C15]">
            <div className="flex items-center gap-3 border-b border-white/[0.06] px-4 py-3">
              <button onClick={() => setOpenModules((prev) => ({ ...prev, [module.id]: !prev[module.id] }))} className="flex h-6 w-6 items-center justify-center rounded-md border border-white/10 text-[#8492A6]">
                <ChevronDown size={12} className={`transition ${openModules[module.id] ? "" : "-rotate-90"}`} />
              </button>
              <span className="num text-[9px] text-[#455063]">{String(index + 1).padStart(2, "0")}</span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[12px] font-medium text-white">{module.title}</p>
                <p className="text-[9px] text-[#5F6B7E]">{module.lessons.length} lessons · {formatDuration(module.lessons.reduce((s, l) => s + l.durationSeconds, 0))}</p>
              </div>
              <button onClick={() => setModuleModal({ open: true, id: module.id, title: module.title, description: module.description || "" })} className="flex h-7 w-7 items-center justify-center rounded-md border border-white/10 text-[#8492A6] hover:text-white"><Pencil size={11} /></button>
              <button onClick={() => setDeleteTarget({ type: "module", id: module.id, title: module.title })} className="flex h-7 w-7 items-center justify-center rounded-md border border-white/10 text-[#8492A6] hover:border-rose-400/40 hover:text-rose-300"><Trash2 size={11} /></button>
            </div>

            {openModules[module.id] && (
              <div className="p-3">
                <div className="space-y-1">
                  {module.lessons.map((lesson, li) => (
                    <div key={lesson.id} className="flex items-center gap-2 rounded-lg px-2 py-2 hover:bg-white/[0.02]">
                      <span className="num w-7 shrink-0 text-[9px] text-[#455063]">{index + 1}.{li + 1}</span>
                      {lesson.type === "VIDEO" ? <PlayCircle size={12} className="shrink-0 text-[#C9B8FF]" /> : <FileText size={12} className="shrink-0 text-[#20D9E8]" />}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[11px] text-[#D6DFEC]">{lesson.title}</p>
                        <p className="truncate text-[8.5px] text-[#5F6B7E]">
                          {lesson.type} · {formatDuration(lesson.durationSeconds)}
                          {lesson.videoName ? ` · ${lesson.videoName}` : ""}
                          {lesson.pdfName ? ` · ${lesson.pdfName}` : ""}
                          {lesson.isPreview ? " · preview" : ""}
                        </p>
                      </div>
                      <button onClick={() => openLesson(module.id, lesson)} className="flex h-6 w-6 items-center justify-center rounded border border-white/10 text-[#8492A6] hover:text-white"><Pencil size={10} /></button>
                      <button onClick={() => setDeleteTarget({ type: "lesson", id: lesson.id, title: lesson.title })} className="flex h-6 w-6 items-center justify-center rounded border border-white/10 text-[#8492A6] hover:text-rose-300"><Trash2 size={10} /></button>
                    </div>
                  ))}
                  {!module.lessons.length && <p className="px-2 py-3 text-[10px] text-[#5F6B7E]">No lessons in this module yet.</p>}
                </div>
                <button onClick={() => openLesson(module.id)} className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-white/10 py-2 text-[10px] text-[#8492A6] hover:border-[#873BFF]/40 hover:text-white">
                  <Plus size={11} /> Add lesson
                </button>
              </div>
            )}
          </div>
        ))}
        {!modules.length && (
          <div className="rounded-xl border border-dashed border-white/10 py-10 text-center">
            <p className="text-[12px] text-[#8492A6]">No modules yet. Add your first module to start building the curriculum.</p>
          </div>
        )}
      </div>

      {quizzes.length > 0 && (
        <div className="mt-6 rounded-xl border border-white/[0.07] bg-[#0A0C15] p-4">
          <p className="text-[9px] uppercase tracking-[0.16em] text-[#6F7C90]">Assessments</p>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {quizzes.map((quiz) => (
              <Link key={quiz.id} href={`/admin/examinations/${quiz.id}`} className="flex items-center gap-2 rounded-lg border border-white/[0.06] p-2.5 hover:border-white/15">
                <span className={`flex h-6 w-6 items-center justify-center rounded-md ${quiz.type === "EXAM" ? "bg-[#873BFF]/15 text-[#C9B8FF]" : "bg-[#20D9E8]/10 text-[#20D9E8]"}`}><GraduationCap size={11} /></span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[10.5px] text-white">{quiz.title}</p>
                  <p className="text-[8.5px] text-[#5F6B7E]">{quiz.questions} questions · pass {quiz.passMark}%</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* module modal */}
      {moduleModal.open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-white/[0.1] bg-[#0A0C15] p-5">
            <div className="flex items-center justify-between">
              <h3 className="text-[13px] font-semibold text-white">{moduleModal.id ? "Edit module" : "New module"}</h3>
              <button onClick={() => setModuleModal({ open: false, title: "", description: "" })} className="text-[#6F7C90] hover:text-white"><X size={15} /></button>
            </div>
            <div className="mt-4 space-y-3">
              <div>
                <label className="label">Module title</label>
                <input className="field h-10 text-[12px]" value={moduleModal.title} onChange={(e) => setModuleModal({ ...moduleModal, title: e.target.value })} placeholder="Module 1 · Foundations" />
              </div>
              <div>
                <label className="label">Description</label>
                <textarea rows={3} className="field text-[12px]" value={moduleModal.description} onChange={(e) => setModuleModal({ ...moduleModal, description: e.target.value })} />
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button onClick={() => setModuleModal({ open: false, title: "", description: "" })} className="btn btn-ghost btn-sm h-9">Cancel</button>
              <button onClick={saveModule} disabled={busy === "module" || !moduleModal.title.trim()} className="btn btn-primary btn-sm h-9">
                {busy === "module" ? <Loader2 size={12} className="animate-spin" /> : "Save module"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* lesson modal */}
      {lessonModal.open && (
        <div className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto bg-black/75 p-4 backdrop-blur-sm sm:p-8">
          <div className="w-full max-w-[620px] rounded-2xl border border-white/[0.1] bg-[#0A0C15]">
            <div className="flex items-center justify-between border-b border-white/[0.07] px-5 py-3.5">
              <h3 className="text-[13px] font-semibold text-white">{lessonModal.values.id ? "Edit lesson" : "New lesson"}</h3>
              <button onClick={() => setLessonModal({ open: false, moduleId: "", values: { ...emptyLesson } })} className="text-[#6F7C90] hover:text-white"><X size={15} /></button>
            </div>
            <div className="max-h-[65vh] space-y-4 overflow-y-auto p-5">
              <div>
                <label className="label">Lesson title</label>
                <input className="field" value={lessonModal.values.title} onChange={(e) => setLessonModal((p) => ({ ...p, values: { ...p.values, title: e.target.value } }))} placeholder="Battery bank sizing" />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="label">Type</label>
                  <select className="field" value={lessonModal.values.type} onChange={(e) => setLessonModal((p) => ({ ...p, values: { ...p.values, type: e.target.value as LessonRow["type"] } }))}>
                    <option value="VIDEO">Video</option>
                    <option value="PDF">PDF guide</option>
                    <option value="TEXT">Text lesson</option>
                  </select>
                </div>
                <div>
                  <label className="label">Duration (minutes)</label>
                  <input type="number" min={0} className="field" value={lessonModal.values.durationMinutes} onChange={(e) => setLessonModal((p) => ({ ...p, values: { ...p.values, durationMinutes: Number(e.target.value) } }))} />
                </div>
              </div>
              <div>
                <label className="label">Short description</label>
                <textarea rows={2} className="field" value={lessonModal.values.description} onChange={(e) => setLessonModal((p) => ({ ...p, values: { ...p.values, description: e.target.value } }))} />
              </div>

              {lessonModal.values.type === "VIDEO" && (
                <div className="rounded-xl border border-white/[0.07] bg-black/20 p-3">
                  <label className="label">Video source</label>
                  <div className="flex flex-wrap items-center gap-2">
                    <input ref={fileRef} type="file" accept="video/mp4,video/webm" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadFile(f, "VIDEO"); }} />
                    <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading} className="btn btn-ghost btn-sm h-8">
                      {uploading ? <><Loader2 size={11} className="animate-spin" /> {uploadProgress}%</> : <><Upload size={11} /> Upload MP4</>}
                    </button>
                    <span className="text-[9px] text-[#5F6B7E]">or</span>
                    <input className="field h-8 flex-1 text-[10.5px]" placeholder="https://vimeo.com/… or direct MP4 URL" value={lessonModal.values.videoUrl} onChange={(e) => setLessonModal((p) => ({ ...p, values: { ...p.values, videoUrl: e.target.value } }))} />
                  </div>
                  {lessonModal.values.videoAssetId && <p className="mt-2 flex items-center gap-1 text-[9px] text-emerald-300"><PlayCircle size={10} /> Video attached (asset {lessonModal.values.videoAssetId.slice(0, 8)}…)</p>}
                  <p className="mt-1.5 text-[8.5px] text-[#5F6B7E]">Uploads stream through an authorised endpoint. MP4 or WebM up to 1GB.</p>
                </div>
              )}

              {lessonModal.values.type === "PDF" && (
                <div className="rounded-xl border border-white/[0.07] bg-black/20 p-3">
                  <label className="label">PDF material</label>
                  <div className="flex flex-wrap items-center gap-2">
                    <input ref={fileRef} type="file" accept="application/pdf" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadFile(f, "PDF"); }} />
                    <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading} className="btn btn-ghost btn-sm h-8">
                      {uploading ? <Loader2 size={11} className="animate-spin" /> : <><Upload size={11} /> Upload PDF</>}
                    </button>
                    {lessonModal.values.pdfAssetId && <span className="flex items-center gap-1 text-[9px] text-emerald-300"><FileText size={10} /> PDF attached</span>}
                  </div>
                  <p className="mt-1.5 text-[8.5px] text-[#5F6B7E]">PDFs are viewable in the portal and Android app, protected by enrolment checks.</p>
                </div>
              )}

              {lessonModal.values.type === "TEXT" && (
                <div>
                  <label className="label">Lesson content</label>
                  <textarea rows={7} className="field" value={lessonModal.values.content} onChange={(e) => setLessonModal((p) => ({ ...p, values: { ...p.values, content: e.target.value } }))} placeholder="Write the lesson text. Separate paragraphs with a new line." />
                </div>
              )}

              <div className="flex flex-wrap gap-4">
                <label className="flex items-center gap-2 text-[10.5px] text-[#C2CCDD]">
                  <input type="checkbox" checked={lessonModal.values.isPreview} onChange={(e) => setLessonModal((p) => ({ ...p, values: { ...p.values, isPreview: e.target.checked } }))} className="h-3.5 w-3.5 appearance-none rounded border border-white/20 bg-white/[0.03] checked:border-[#873BFF] checked:bg-[#873BFF]" />
                  Free preview
                </label>
                <label className="flex items-center gap-2 text-[10.5px] text-[#C2CCDD]">
                  <input type="checkbox" checked={lessonModal.values.isPublished} onChange={(e) => setLessonModal((p) => ({ ...p, values: { ...p.values, isPublished: e.target.checked } }))} className="h-3.5 w-3.5 appearance-none rounded border border-white/20 bg-white/[0.03] checked:border-[#873BFF] checked:bg-[#873BFF]" />
                  Published
                </label>
              </div>
            </div>
            <div className="flex justify-end gap-2 border-t border-white/[0.07] px-5 py-3.5">
              <button onClick={() => setLessonModal({ open: false, moduleId: "", values: { ...emptyLesson } })} className="btn btn-ghost btn-sm h-9">Cancel</button>
              <button onClick={saveLesson} disabled={busy === "lesson" || !lessonModal.values.title.trim() || uploading} className="btn btn-primary btn-sm h-9">
                {busy === "lesson" ? <Loader2 size={12} className="animate-spin" /> : "Save lesson"}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border border-white/[0.1] bg-[#0A0C15] p-5">
            <h3 className="text-[13px] font-semibold text-white">Delete {deleteTarget.type}?</h3>
            <p className="mt-1 text-[11px] text-[#8492A6]">“{deleteTarget.title}” will be removed. {deleteTarget.type === "module" ? "All lessons inside it will also be deleted." : "Learner progress for this lesson will be removed."}</p>
            <div className="mt-5 flex gap-2">
              <button onClick={() => setDeleteTarget(null)} className="btn btn-ghost btn-sm h-9 flex-1">Cancel</button>
              <button onClick={confirmDelete} disabled={busy === "delete"} className="btn btn-danger btn-sm h-9 flex-1">{busy === "delete" ? <Loader2 size={12} className="animate-spin" /> : "Delete"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
