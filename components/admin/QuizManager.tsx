"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AlertCircle, CheckCircle2, ClipboardList, Loader2, Plus, Trash2, X } from "lucide-react";

type QuizRow = {
  id: string;
  title: string;
  type: string;
  passMark: number;
  timeLimitMinutes: number;
  questions: number;
  isPublished: boolean;
  courseTitle: string;
  courseId: string;
  moduleName: string | null;
  isRequired: boolean;
};

type ModuleOption = { id: string; title: string; courseId: string };

export function QuizManager({
  quizzes,
  courses,
  modules,
}: {
  quizzes: QuizRow[];
  courses: { id: string; title: string }[];
  modules: ModuleOption[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    courseId: courses[0]?.id || "",
    moduleId: "",
    title: "",
    description: "",
    type: "QUIZ" as "QUIZ" | "EXAM",
    passMark: 70,
    timeLimitMinutes: 20,
    maxAttempts: 2,
    questionCount: 10,
    randomizeQuestions: true,
    randomizeOptions: true,
    isRequired: true,
    isPublished: true,
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [deleting, setDeleting] = useState<QuizRow | null>(null);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/admin/content/quizzes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not create the assessment.");
      setOpen(false);
      router.push(`/admin/examinations/${data.record.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not create the assessment.");
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!deleting) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/content/quizzes/${deleting.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Delete failed.");
      setDeleting(null);
      setSuccess("Assessment deleted.");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Delete failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-[1150px]">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-[#455063]">Academy / examinations</p>
          <h1 className="mt-1.5 text-[22px] font-semibold tracking-[-0.03em] text-white">Examinations & quizzes</h1>
          <p className="mt-1 text-[11.5px] text-[#8492A6]">Final assessments unlock certificates. Answers are graded server-side.</p>
        </div>
        <button onClick={() => setOpen(true)} disabled={!courses.length} className="btn btn-primary btn-sm h-8"><Plus size={12} /> New assessment</button>
      </div>

      {error && <p className="mt-4 flex items-center gap-2 rounded-lg border border-rose-400/20 bg-rose-500/10 px-3 py-2 text-[11px] text-rose-200"><AlertCircle size={12} /> {error}</p>}
      {success && <p className="mt-4 flex items-center gap-2 rounded-lg border border-emerald-400/20 bg-emerald-500/10 px-3 py-2 text-[11px] text-emerald-200"><CheckCircle2 size={12} /> {success}</p>}

      <div className="mt-4 table-wrap">
        <table className="data">
          <thead>
            <tr><th>Assessment</th><th>Course</th><th>Type</th><th>Questions</th><th>Pass</th><th>Time</th><th>Live</th><th className="text-right">Manage</th></tr>
          </thead>
          <tbody>
            {quizzes.map((quiz) => (
              <tr key={quiz.id}>
                <td className="font-medium text-white">{quiz.title}</td>
                <td className="max-w-[200px] truncate text-[11px]">{quiz.courseTitle}</td>
                <td><span className={`inline-flex rounded-full border px-1.5 py-0.5 text-[8.5px] uppercase ${quiz.type === "EXAM" ? "border-[#873BFF]/25 bg-[#873BFF]/10 text-[#C9B8FF]" : "border-[#20D9E8]/25 bg-[#20D9E8]/10 text-[#7FE9F2]"}`}>{quiz.type}</span></td>
                <td className="num">{quiz.questions}</td>
                <td className="num">{quiz.passMark}%</td>
                <td className="text-[10px]">{quiz.timeLimitMinutes ? `${quiz.timeLimitMinutes} min` : "—"}</td>
                <td><span className={quiz.isPublished ? "text-emerald-300" : "text-amber-300"}>{quiz.isPublished ? "Yes" : "No"}</span></td>
                <td>
                  <div className="flex justify-end gap-1">
                    <Link href={`/admin/examinations/${quiz.id}`} className="flex h-7 items-center gap-1 rounded-md border border-white/10 px-2 text-[9.5px] text-[#C2CCDD] hover:text-white"><ClipboardList size={10} /> Questions</Link>
                    <button onClick={() => setDeleting(quiz)} className="flex h-7 w-7 items-center justify-center rounded-md border border-white/10 text-[#8492A6] hover:border-rose-400/40 hover:text-rose-300"><Trash2 size={10} /></button>
                  </div>
                </td>
              </tr>
            ))}
            {!quizzes.length && <tr><td colSpan={8} className="py-12 text-center text-[11px] text-[#6F7C90]">No assessments yet.</td></tr>}
          </tbody>
        </table>
      </div>

      {open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
          <form onSubmit={create} className="w-full max-w-md rounded-2xl border border-white/[0.1] bg-[#0A0C15] p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-[13px] font-semibold text-white">New assessment</h2>
              <button type="button" onClick={() => setOpen(false)} className="text-[#6F7C90] hover:text-white"><X size={15} /></button>
            </div>
            {error && <p className="mt-3 rounded-lg border border-rose-400/20 bg-rose-500/10 px-2.5 py-2 text-[10.5px] text-rose-200">{error}</p>}
            <div className="mt-4 space-y-3">
              <div>
                <label className="label">Course</label>
                <select className="field h-10 text-[12px]" value={form.courseId} onChange={(e) => setForm({ ...form, courseId: e.target.value, moduleId: "" })}>
                  {courses.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Module / assessment scope</label>
                <select className="field h-10 text-[12px]" value={form.moduleId} onChange={(e) => setForm({ ...form, moduleId: e.target.value })}>
                  <option value="">Course-level (final exam or practice)</option>
                  {modules.filter((m) => m.courseId === form.courseId).map((m) => <option key={m.id} value={m.id}>{m.title}</option>)}
                </select>
                <p className="mt-1 text-[9px] text-[#5F6B7E]">Attach a quiz to a module to unlock the next module after a pass.</p>
              </div>
              <div><label className="label">Title</label><input required className="field h-10 text-[12px]" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Final assessment" /></div>
              <div><label className="label">Description</label><textarea rows={2} className="field text-[12px]" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Type</label>
                  <select className="field h-10 text-[12px]" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as "QUIZ" | "EXAM" })}>
                    <option value="EXAM">Final exam</option>
                    <option value="QUIZ">Module quiz</option>
                  </select>
                </div>
                <div><label className="label">Pass mark (%)</label><input type="number" min={0} max={100} className="field h-10 text-[12px]" value={form.passMark} onChange={(e) => setForm({ ...form, passMark: Number(e.target.value) })} /></div>
                <div><label className="label">Time limit (min)</label><input type="number" min={0} className="field h-10 text-[12px]" value={form.timeLimitMinutes} onChange={(e) => setForm({ ...form, timeLimitMinutes: Number(e.target.value) })} /></div>
                <div><label className="label">Max attempts</label><input type="number" min={0} className="field h-10 text-[12px]" value={form.maxAttempts} onChange={(e) => setForm({ ...form, maxAttempts: Number(e.target.value) })} /></div>
                <div><label className="label">Questions per attempt</label><input type="number" min={0} className="field h-10 text-[12px]" value={form.questionCount} onChange={(e) => setForm({ ...form, questionCount: Number(e.target.value) })} /></div>
                <div className="flex flex-col justify-end gap-1.5 pb-1 text-[10px] text-[#C2CCDD]">
                  <label className="flex items-center gap-2"><input type="checkbox" checked={form.randomizeQuestions} onChange={(e) => setForm({ ...form, randomizeQuestions: e.target.checked })} className="h-3.5 w-3.5 accent-[#873BFF]" /> Randomise questions</label>
                  <label className="flex items-center gap-2"><input type="checkbox" checked={form.randomizeOptions} onChange={(e) => setForm({ ...form, randomizeOptions: e.target.checked })} className="h-3.5 w-3.5 accent-[#873BFF]" /> Randomise options</label>
                </div>
              </div>
              <label className="flex items-center gap-2 text-[11px] text-[#C2CCDD]">
                <input type="checkbox" checked={form.isRequired} onChange={(e) => setForm({ ...form, isRequired: e.target.checked })} className="h-4 w-4 accent-[#873BFF]" />
                Required for progression (module must be passed to unlock the next module)
              </label>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => setOpen(false)} className="btn btn-ghost btn-sm h-9">Cancel</button>
              <button type="submit" disabled={busy} className="btn btn-primary btn-sm h-9">{busy ? <Loader2 size={12} className="animate-spin" /> : "Create"}</button>
            </div>
          </form>
        </div>
      )}

      {deleting && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border border-white/[0.1] bg-[#0A0C15] p-5">
            <h3 className="text-[13px] font-semibold text-white">Delete assessment?</h3>
            <p className="mt-1 text-[11px] text-[#8492A6]">“{deleting.title}” and all of its questions and attempts will be removed.</p>
            <div className="mt-5 flex gap-2">
              <button onClick={() => setDeleting(null)} className="btn btn-ghost btn-sm h-9 flex-1">Cancel</button>
              <button onClick={remove} disabled={busy} className="btn btn-danger btn-sm h-9 flex-1">{busy ? <Loader2 size={12} className="animate-spin" /> : "Delete"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
