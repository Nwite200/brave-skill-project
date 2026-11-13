"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Download,
  Loader2,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  XCircle,
} from "lucide-react";

type QuizMeta = {
  id: string;
  title: string;
  description: string | null;
  type: "QUIZ" | "EXAM";
  passMark: number;
  timeLimitMinutes: number;
  maxAttempts: number;
  questions: number;
  course: { id: string; title: string; slug: string; certificateEnabled: boolean };
  lessonsComplete: boolean;
  attemptsUsed: number;
  lessons: { completed: number; total: number };
  bestPercent: number | null;
};

type Question = { id: string; prompt: string; options: string[]; points: number };
type Result = {
  score: number;
  maxScore: number;
  percent: number;
  passed: boolean;
  expired: boolean;
  passMark: number;
  certificateSerial?: string | null;
  certificateNote?: string | null;
  review?: { questionId: string; selected: number; correctIndex: number; correct: boolean; explanation?: string | null }[];
};

export function QuizRunner({ quiz }: { quiz: QuizMeta }) {
  const [stage, setStage] = useState<"intro" | "active" | "result">("intro");
  const [attemptId, setAttemptId] = useState("");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<number[]>([]);
  const [current, setCurrent] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [confirming, setConfirming] = useState(false);
  const submittedRef = useRef(false);
  const [attemptsUsed, setAttemptsUsed] = useState(quiz.attemptsUsed);

  const canAttempt = quiz.maxAttempts === 0 || attemptsUsed < quiz.maxAttempts;

  const submitAttempt = useCallback(
    async (auto = false) => {
      if (submittedRef.current || !attemptId) return;
      submittedRef.current = true;
      setSubmitting(true);
      setConfirming(false);
      try {
        const res = await fetch(`/api/attempts/${attemptId}/submit`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ answers }),
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || "Could not submit your answers.");
          submittedRef.current = false;
          setSubmitting(false);
          return;
        }
        setResult(data);
        setStage("result");
        setAttemptsUsed((n) => n + 1);
        setSecondsLeft(null);
      } catch {
        setError("Network error while submitting. Your attempt is still open — try again.");
        submittedRef.current = false;
      } finally {
        setSubmitting(false);
        if (auto) setError((prev) => prev || "Time expired — your answers were submitted automatically.");
      }
    },
    [answers, attemptId],
  );

  useEffect(() => {
    if (stage !== "active" || secondsLeft === null) return;
    if (secondsLeft <= 0) {
      submitAttempt(true);
      return;
    }
    const timer = setTimeout(() => setSecondsLeft((s) => (s === null ? null : s - 1)), 1000);
    return () => clearTimeout(timer);
  }, [secondsLeft, stage, submitAttempt]);

  const start = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/quizzes/${quiz.id}/start`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Unable to start this assessment.");
        setLoading(false);
        return;
      }
      const qs: Question[] = data.questions;
      setAttemptId(data.attempt.id);
      setQuestions(qs);
      setAnswers(new Array(qs.length).fill(-1));
      setCurrent(0);
      setStage("active");
      submittedRef.current = false;
      if (data.quiz.timeLimitMinutes > 0) {
        const elapsed = Math.floor((Date.now() - new Date(data.attempt.startedAt).getTime()) / 1000);
        setSecondsLeft(Math.max(0, data.quiz.timeLimitMinutes * 60 - elapsed));
      } else {
        setSecondsLeft(null);
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const answered = answers.filter((a) => a >= 0).length;

  if (stage === "intro") {
    return (
      <div className="mx-auto max-w-[720px]">
        <Link href="/dashboard/assessments" className="inline-flex items-center gap-1.5 text-[11px] text-[#8492A6] hover:text-white">
          <ArrowLeft size={12} /> All assessments
        </Link>

        <div className="mt-4 overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0B0E18]">
          <div className="relative border-b border-white/[0.07] p-6">
            <div className="pointer-events-none absolute right-0 top-0 h-40 w-40 rounded-full bg-[#873BFF]/10 blur-[50px]" />
            <span className={`chip ${quiz.type === "EXAM" ? "border-[#873BFF]/25 bg-[#873BFF]/10 text-[#C9B8FF]" : "border-[#20D9E8]/25 bg-[#20D9E8]/10 text-[#7FE9F2]"}`}>
              {quiz.type === "EXAM" ? "Final assessment" : "Module quiz"}
            </span>
            <h1 className="mt-4 text-[24px] font-semibold tracking-[-0.03em] text-white">{quiz.title}</h1>
            <p className="mt-1 text-[11px] text-[#6F7C90]">{quiz.course.title}</p>
            {quiz.description && <p className="mt-3 max-w-[520px] text-[12px] leading-relaxed text-[#8B98AD]">{quiz.description}</p>}
          </div>

          <div className="grid gap-4 p-6 sm:grid-cols-3">
            {[
              { label: "Questions", value: String(quiz.questions) },
              { label: "Pass mark", value: `${quiz.passMark}%` },
              { label: "Time limit", value: quiz.timeLimitMinutes ? `${quiz.timeLimitMinutes} min` : "None" },
            ].map((item) => (
              <div key={item.label} className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
                <p className="text-[9px] uppercase tracking-[0.16em] text-[#6F7C90]">{item.label}</p>
                <p className="num mt-1 text-[16px] font-semibold text-white">{item.value}</p>
              </div>
            ))}
          </div>

          <div className="border-t border-white/[0.07] p-6">
            {error && (
              <div className="mb-4 flex items-start gap-2 rounded-lg border border-rose-400/20 bg-rose-500/10 px-3 py-2.5 text-[11.5px] text-rose-200">
                <AlertCircle size={13} className="mt-0.5 shrink-0" /> {error}
              </div>
            )}

            {!quiz.lessonsComplete && quiz.type === "EXAM" ? (
              <div className="rounded-xl border border-amber-400/20 bg-amber-500/[0.07] p-4">
                <p className="text-[12px] font-medium text-amber-200">Complete all lessons first</p>
                <p className="mt-1 text-[11px] leading-relaxed text-amber-200/70">
                  You have completed {quiz.lessons.completed} of {quiz.lessons.total} lessons. The final assessment unlocks once every lesson is marked complete.
                </p>
                <Link href={`/dashboard/courses/${quiz.course.id}`} className="btn btn-ghost btn-sm mt-3 h-8">Continue course</Link>
              </div>
            ) : !canAttempt ? (
              <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4">
                <p className="text-[12px] font-medium text-white">No attempts remaining</p>
                <p className="mt-1 text-[11px] text-[#8492A6]">You have used {attemptsUsed} of {quiz.maxAttempts} attempts. Contact support if you need a reset.</p>
              </div>
            ) : (
              <>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="text-[10.5px] text-[#8492A6]">
                    {quiz.attemptsUsed > 0 ? (
                      <>Best score: <span className="text-white">{quiz.bestPercent}%</span> · Attempts used: {attemptsUsed}{quiz.maxAttempts > 0 ? ` of ${quiz.maxAttempts}` : ""}</>
                    ) : (
                      <>This assessment is available now.</>
                    )}
                  </div>
                  <button onClick={start} disabled={loading} className="btn btn-primary">
                    {loading ? <Loader2 size={15} className="animate-spin" /> : <>{quiz.attemptsUsed > 0 ? "Retake assessment" : "Start assessment"} <ArrowRight size={14} /></>}
                  </button>
                </div>
                {quiz.type === "EXAM" && (
                  <p className="mt-4 flex items-start gap-2 rounded-lg border border-white/[0.06] bg-white/[0.02] p-3 text-[10px] leading-relaxed text-[#6F7C90]">
                    <ShieldCheck size={13} className="mt-0.5 shrink-0 text-[#10C99A]" />
                    The exam is graded on the server. You must score at least {quiz.passMark}% to pass. On passing, your verifiable certificate is issued automatically.
                  </p>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (stage === "result" && result) {
    const passed = result.passed;
    return (
      <div className="mx-auto max-w-[720px]">
        <div className={`overflow-hidden rounded-2xl border ${passed ? "border-emerald-400/25" : "border-rose-400/20"} bg-[#0B0E18]`}>
          <div className={`relative p-8 text-center ${passed ? "bg-gradient-to-b from-emerald-500/[0.12] to-transparent" : "bg-gradient-to-b from-rose-500/[0.08] to-transparent"}`}>
            <div className={`mx-auto flex h-16 w-16 items-center justify-center rounded-full border ${passed ? "border-emerald-400/30 bg-emerald-500/15 text-emerald-300" : "border-rose-400/25 bg-rose-500/10 text-rose-300"}`}>
              {passed ? <CheckCircle2 size={30} /> : <XCircle size={30} />}
            </div>
            <h1 className="mt-4 text-[24px] font-semibold tracking-[-0.03em] text-white">
              {result.expired ? "Time expired" : passed ? "Assessment passed" : "Not passed this time"}
            </h1>
            <p className="mt-1 text-[11.5px] text-[#8492A6]">{quiz.title}</p>

            <div className="mx-auto mt-6 flex max-w-[360px] items-center justify-center gap-6">
              <div>
                <p className="num text-[34px] font-semibold tracking-[-0.04em] text-white">{result.percent}%</p>
                <p className="text-[9px] uppercase tracking-[0.16em] text-[#6F7C90]">Your score</p>
              </div>
              <div className="h-10 w-px bg-white/10" />
              <div>
                <p className="num text-[20px] font-semibold text-[#C2CCDD]">{result.score}/{result.maxScore}</p>
                <p className="text-[9px] uppercase tracking-[0.16em] text-[#6F7C90]">Points · pass {result.passMark}%</p>
              </div>
            </div>
          </div>

          <div className="space-y-3 p-6">
            {result.certificateSerial && (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-emerald-400/25 bg-emerald-500/[0.07] p-4">
                <div className="flex items-center gap-3">
                  <BadgeCheck size={20} className="text-emerald-300" />
                  <div>
                    <p className="text-[12px] font-medium text-white">Certificate issued</p>
                    <p className="num text-[10px] text-[#93A1B6]">{result.certificateSerial}</p>
                  </div>
                </div>
                <a href={`/api/certificates/${result.certificateSerial}/pdf`} target="_blank" rel="noreferrer" className="btn btn-ghost btn-sm h-8"><Download size={12} /> Download PDF</a>
              </div>
            )}
            {result.certificateNote && (
              <p className="rounded-xl border border-amber-400/20 bg-amber-500/[0.06] p-3 text-[11px] text-amber-200">{result.certificateNote}</p>
            )}

            {result.review && (
              <div className="space-y-2">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#6F7C90]">Answer review</p>
                {questions.map((question, index) => {
                  const review = result.review?.find((r) => r.questionId === question.id);
                  return (
                    <div key={question.id} className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
                      <div className="flex items-start gap-2">
                        {review?.correct ? <CheckCircle2 size={13} className="mt-0.5 shrink-0 text-emerald-400" /> : <XCircle size={13} className="mt-0.5 shrink-0 text-rose-400" />}
                        <p className="text-[11px] text-[#D6DFEC]">{index + 1}. {question.prompt}</p>
                      </div>
                      <p className="mt-1.5 pl-5 text-[10px] text-[#8492A6]">
                        Correct answer: <span className="text-emerald-300">{question.options[review?.correctIndex ?? 0]}</span>
                        {!review?.correct && <> · You chose: <span className="text-rose-300">{review && review.selected >= 0 ? question.options[review.selected] : "No answer"}</span></>}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="flex flex-wrap gap-2 pt-2">
              <Link href="/dashboard/assessments" className="btn btn-ghost btn-sm h-9">All assessments</Link>
              <Link href={`/dashboard/courses/${quiz.course.id}`} className="btn btn-primary btn-sm h-9">Back to course</Link>
              {!passed && canAttempt && (
                <button onClick={() => { setStage("intro"); setResult(null); setError(""); }} className="btn btn-ghost btn-sm h-9"><RotateCcw size={12} /> Retake</button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const question = questions[current];
  const progressPercent = questions.length ? Math.round((answered / questions.length) * 100) : 0;

  return (
    <div className="mx-auto max-w-[820px]">
      <div className="sticky top-[62px] z-20 -mx-4 mb-5 flex flex-wrap items-center gap-3 border-b border-white/[0.06] bg-[#050509]/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6">
        <div className="min-w-0 flex-1">
          <p className="truncate text-[11.5px] font-medium text-white">{quiz.title}</p>
          <p className="text-[9.5px] text-[#6F7C90]">Question {current + 1} of {questions.length} · {answered} answered</p>
        </div>
        {secondsLeft !== null && (
          <span className={`num flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] ${secondsLeft < 60 ? "border-rose-400/30 bg-rose-500/10 text-rose-300" : "border-white/10 text-[#C2CCDD]"}`}>
            <Clock3 size={12} /> {Math.floor(secondsLeft / 60)}:{String(secondsLeft % 60).padStart(2, "0")}
          </span>
        )}
        <button onClick={() => setConfirming(true)} disabled={submitting} className="btn btn-primary btn-sm h-8">
          {submitting ? <Loader2 size={12} className="animate-spin" /> : "Submit"}
        </button>
      </div>

      <div className="h-1 overflow-hidden rounded-full bg-white/[0.07]">
        <div className="h-full rounded-full bg-gradient-to-r from-[#873BFF] to-[#20D9E8] transition-all" style={{ width: `${progressPercent}%` }} />
      </div>

      {error && (
        <div className="mt-4 flex items-start gap-2 rounded-lg border border-rose-400/20 bg-rose-500/10 px-3 py-2.5 text-[11.5px] text-rose-200">
          <AlertCircle size={13} className="mt-0.5 shrink-0" /> {error}
        </div>
      )}

      {question && (
        <div className="mt-6 rounded-2xl border border-white/[0.08] bg-[#0B0E18] p-5 sm:p-7">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#873BFF]">Question {current + 1}</p>
          <h2 className="mt-3 text-[17px] font-medium leading-relaxed text-white">{question.prompt}</h2>

          <div className="mt-5 space-y-2">
            {question.options.map((option, index) => {
              const selected = answers[current] === index;
              return (
                <button
                  key={index}
                  type="button"
                  onClick={() => setAnswers((prev) => { const next = [...prev]; next[current] = index; return next; })}
                  className={`flex w-full items-center gap-3 rounded-xl border p-3.5 text-left transition ${selected ? "border-[#873BFF]/60 bg-[#873BFF]/10" : "border-white/[0.08] bg-white/[0.015] hover:border-white/20 hover:bg-white/[0.03]"}`}
                >
                  <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[10px] font-semibold ${selected ? "border-[#873BFF] bg-[#873BFF] text-white" : "border-white/15 text-[#8492A6]"}`}>
                    {String.fromCharCode(65 + index)}
                  </span>
                  <span className={`text-[12px] leading-relaxed ${selected ? "text-white" : "text-[#C2CCDD]"}`}>{option}</span>
                </button>
              );
            })}
          </div>

          <div className="mt-6 flex items-center justify-between gap-3 border-t border-white/[0.06] pt-4">
            <button onClick={() => setCurrent((c) => Math.max(0, c - 1))} disabled={current === 0} className="btn btn-ghost btn-sm h-9 disabled:opacity-40">
              <ChevronLeft size={13} /> Previous
            </button>

            <div className="flex flex-wrap items-center justify-center gap-1">
              {questions.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrent(index)}
                  aria-label={`Go to question ${index + 1}`}
                  className={`h-6 w-6 rounded text-[9px] ${index === current ? "bg-[#873BFF] text-white" : answers[index] >= 0 ? "bg-emerald-500/20 text-emerald-300" : "bg-white/[0.05] text-[#6F7C90]"}`}
                >
                  {index + 1}
                </button>
              ))}
            </div>

            {current < questions.length - 1 ? (
              <button onClick={() => setCurrent((c) => Math.min(questions.length - 1, c + 1))} className="btn btn-light btn-sm h-9">
                Next <ChevronRight size={13} />
              </button>
            ) : (
              <button onClick={() => setConfirming(true)} className="btn btn-primary btn-sm h-9">
                Review & submit <ArrowRight size={12} />
              </button>
            )}
          </div>
        </div>
      )}

      {confirming && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border border-white/[0.1] bg-[#0B0E18] p-6">
            <Sparkles size={20} className="text-[#C9B8FF]" />
            <h3 className="mt-3 text-[16px] font-semibold text-white">Submit your answers?</h3>
            <p className="mt-1.5 text-[11.5px] leading-relaxed text-[#8492A6]">
              You have answered {answered} of {questions.length} questions. You cannot change your answers after submitting.
            </p>
            <div className="mt-5 flex gap-2">
              <button onClick={() => setConfirming(false)} className="btn btn-ghost btn-sm flex-1 h-9">Keep working</button>
              <button onClick={() => submitAttempt()} disabled={submitting} className="btn btn-primary btn-sm flex-1 h-9">
                {submitting ? <Loader2 size={13} className="animate-spin" /> : "Submit now"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
