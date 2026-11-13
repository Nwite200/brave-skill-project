"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { AlertCircle, CheckCircle2, Loader2, Pencil, Plus, Trash2, X } from "lucide-react";

type Question = {
  id: string;
  prompt: string;
  options: string[];
  correctIndex: number;
  explanation: string | null;
  points: number;
};

const empty = { id: "", prompt: "", options: ["", "", "", ""], correctIndex: 0, explanation: "", points: 1 };

export function QuestionEditor({ quizId, questions }: { quizId: string; questions: Question[] }) {
  const router = useRouter();
  const [modal, setModal] = useState<{ open: boolean; values: typeof empty }>({ open: false, values: empty });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [deleting, setDeleting] = useState<Question | null>(null);

  const save = async () => {
    setBusy(true);
    setError("");
    try {
      const payload = {
        quizId,
        prompt: modal.values.prompt,
        options: modal.values.options.filter((o) => o.trim()),
        correctIndex: modal.values.correctIndex,
        explanation: modal.values.explanation,
        points: modal.values.points,
        position: modal.values.id ? questions.findIndex((q) => q.id === modal.values.id) : questions.length,
      };
      const res = await fetch(`/api/admin/content/questions${modal.values.id ? `/${modal.values.id}` : ""}`, {
        method: modal.values.id ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not save the question.");
      setModal({ open: false, values: empty });
      setSuccess("Question saved.");
      router.refresh();
      setTimeout(() => setSuccess(""), 2500);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save the question.");
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!deleting) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/content/questions/${deleting.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Delete failed.");
      setDeleting(null);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Delete failed.");
    } finally {
      setBusy(false);
    }
  };

  const updateOption = (index: number, value: string) => {
    const options = [...modal.values.options];
    options[index] = value;
    setModal({ ...modal, values: { ...modal.values, options } });
  };

  return (
    <div>
      <div className="flex items-center justify-between">
        <p className="text-[9px] uppercase tracking-[0.18em] text-[#6F7C90]">Questions · {questions.length}</p>
        <button onClick={() => setModal({ open: true, values: { ...empty } })} className="btn btn-primary btn-sm h-8"><Plus size={11} /> Add question</button>
      </div>

      {error && <p className="mt-3 flex items-center gap-2 rounded-lg border border-rose-400/20 bg-rose-500/10 px-3 py-2 text-[10.5px] text-rose-200"><AlertCircle size={11} /> {error}</p>}
      {success && <p className="mt-3 flex items-center gap-2 rounded-lg border border-emerald-400/20 bg-emerald-500/10 px-3 py-2 text-[10.5px] text-emerald-200"><CheckCircle2 size={11} /> {success}</p>}

      <div className="mt-3 space-y-2">
        {questions.map((question, index) => (
          <div key={question.id} className="rounded-xl border border-white/[0.07] bg-[#0A0C15] p-4">
            <div className="flex items-start gap-3">
              <span className="num mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-white/10 text-[9px] text-[#8492A6]">{index + 1}</span>
              <div className="min-w-0 flex-1">
                <p className="text-[11.5px] leading-relaxed text-white">{question.prompt}</p>
                <div className="mt-2 grid gap-1 sm:grid-cols-2">
                  {question.options.map((option, oi) => (
                    <p key={oi} className={`flex items-start gap-1.5 text-[10px] ${oi === question.correctIndex ? "text-emerald-300" : "text-[#8492A6]"}`}>
                      <span className="font-mono">{String.fromCharCode(65 + oi)}.</span> {option} {oi === question.correctIndex && <span className="text-[8px]">✓</span>}
                    </p>
                  ))}
                </div>
              </div>
              <div className="flex shrink-0 gap-1">
                <button onClick={() => setModal({ open: true, values: { ...question, explanation: question.explanation || "" } })} className="flex h-6 w-6 items-center justify-center rounded border border-white/10 text-[#8492A6] hover:text-white"><Pencil size={10} /></button>
                <button onClick={() => setDeleting(question)} className="flex h-6 w-6 items-center justify-center rounded border border-white/10 text-[#8492A6] hover:text-rose-300"><Trash2 size={10} /></button>
              </div>
            </div>
          </div>
        ))}
        {!questions.length && <div className="rounded-xl border border-dashed border-white/10 py-10 text-center text-[11px] text-[#6F7C90]">No questions yet. Add the first one.</div>}
      </div>

      {modal.open && (
        <div className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto bg-black/75 p-4 backdrop-blur-sm sm:p-8">
          <div className="w-full max-w-[620px] rounded-2xl border border-white/[0.1] bg-[#0A0C15] p-5">
            <div className="flex items-center justify-between">
              <h3 className="text-[13px] font-semibold text-white">{modal.values.id ? "Edit question" : "New question"}</h3>
              <button onClick={() => setModal({ open: false, values: empty })} className="text-[#6F7C90] hover:text-white"><X size={15} /></button>
            </div>
            <div className="mt-4 space-y-3">
              <div>
                <label className="label">Question prompt</label>
                <textarea rows={3} className="field text-[12px]" value={modal.values.prompt} onChange={(e) => setModal({ ...modal, values: { ...modal.values, prompt: e.target.value } })} />
              </div>
              <div>
                <label className="label">Options · select the correct answer</label>
                <div className="space-y-2">
                  {modal.values.options.map((option, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <input type="radio" name="correct" checked={modal.values.correctIndex === index} onChange={() => setModal({ ...modal, values: { ...modal.values, correctIndex: index } })} className="h-3.5 w-3.5 accent-[#873BFF]" />
                      <input className="field h-9 flex-1 text-[11px]" placeholder={`Option ${String.fromCharCode(65 + index)}`} value={option} onChange={(e) => updateOption(index, e.target.value)} />
                      {modal.values.options.length > 2 && (
                        <button onClick={() => setModal({ ...modal, values: { ...modal.values, options: modal.values.options.filter((_, i) => i !== index), correctIndex: Math.min(modal.values.correctIndex, modal.values.options.length - 2) } })} className="text-[#6F7C90] hover:text-rose-300"><X size={13} /></button>
                      )}
                    </div>
                  ))}
                </div>
                {modal.values.options.length < 6 && (
                  <button onClick={() => setModal({ ...modal, values: { ...modal.values, options: [...modal.values.options, ""] } })} className="mt-2 text-[10px] text-[#C9B8FF] hover:text-white">+ Add option</button>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="label">Points</label><input type="number" min={1} className="field h-9 text-[11px]" value={modal.values.points} onChange={(e) => setModal({ ...modal, values: { ...modal.values, points: Number(e.target.value) } })} /></div>
                <div><label className="label">Correct option</label><input className="field h-9 text-[11px]" value={`Option ${String.fromCharCode(65 + modal.values.correctIndex)}`} readOnly /></div>
              </div>
              <div><label className="label">Explanation (shown after quizzes)</label><textarea rows={2} className="field text-[11px]" value={modal.values.explanation} onChange={(e) => setModal({ ...modal, values: { ...modal.values, explanation: e.target.value } })} /></div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button onClick={() => setModal({ open: false, values: empty })} className="btn btn-ghost btn-sm h-9">Cancel</button>
              <button onClick={save} disabled={busy || !modal.values.prompt.trim() || modal.values.options.filter((o) => o.trim()).length < 2} className="btn btn-primary btn-sm h-9">{busy ? <Loader2 size={12} className="animate-spin" /> : "Save question"}</button>
            </div>
          </div>
        </div>
      )}

      {deleting && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border border-white/[0.1] bg-[#0A0C15] p-5">
            <h3 className="text-[13px] font-semibold text-white">Delete question?</h3>
            <p className="mt-1 line-clamp-2 text-[11px] text-[#8492A6]">{deleting.prompt}</p>
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
