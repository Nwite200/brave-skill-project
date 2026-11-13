"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Circle,
  Download,
  FileText,
  Loader2,
  Lock,
  Maximize2,
  Play,
  PlayCircle,
  Volume2,
} from "lucide-react";
import { formatDuration } from "@/lib/format";

type Lesson = {
  id: string;
  title: string;
  description: string | null;
  type: "VIDEO" | "PDF" | "TEXT";
  durationSeconds: number;
  videoAssetId: string | null;
  pdfAssetId: string | null;
  videoUrl: string | null;
  content: string | null;
  isPreview: boolean;
};

export function LessonPlayer({
  lesson,
  completed,
  watchedSeconds,
  nextLessonId,
  prevLessonId,
  courseId,
  courseTitle,
  modules,
  activeLessonId,
  progressPercent,
  quizzes,
  nextCourseLessonHref,
}: {
  lesson: Lesson;
  completed: boolean;
  watchedSeconds: number;
  nextLessonId: string | null;
  prevLessonId: string | null;
  courseId: string;
  courseTitle: string;
  modules: { id: string; title: string; position: number; lessons: { id: string; title: string; type: string; durationSeconds: number; isPreview: boolean }[] }[];
  activeLessonId: string;
  progressPercent: number;
  quizzes: { id: string; title: string; type: string; questionCount: number; passed: boolean }[];
  nextCourseLessonHref: string | null;
}) {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const lastSent = useRef(0);
  const [saving, setSaving] = useState(false);
  const [isCompleted, setIsCompleted] = useState(completed);
  const [tab, setTab] = useState<"overview" | "resources">("overview");
  const [toast, setToast] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    setIsCompleted(completed);
  }, [completed, lesson.id]);

  const report = useCallback(
    async (payload: { completed?: boolean; watchedSeconds?: number }) => {
      try {
        await fetch("/api/progress", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ lessonId: lesson.id, ...payload }),
        });
      } catch {
        /* offline — will retry on next tick */
      }
    },
    [lesson.id],
  );

  const toggleComplete = async () => {
    const next = !isCompleted;
    setIsCompleted(next);
    setSaving(true);
    await report({ completed: next });
    setSaving(false);
    setToast(next ? "Lesson marked complete" : "Lesson marked incomplete");
    setTimeout(() => setToast(""), 2600);
    router.refresh();
  };

  const onTimeUpdate = () => {
    const video = videoRef.current;
    if (!video) return;
    const seconds = Math.floor(video.currentTime);
    if (seconds - lastSent.current >= 20) {
      lastSent.current = seconds;
      report({ watchedSeconds: seconds });
    }
  };

  const onEnded = async () => {
    if (!isCompleted) {
      setIsCompleted(true);
      await report({ completed: true, watchedSeconds: Math.floor(videoRef.current?.duration || 0) });
      setToast("Lesson complete — progress saved");
      setTimeout(() => setToast(""), 2600);
      router.refresh();
    }
  };

  const videoSrc = lesson.videoAssetId ? `/api/media/${lesson.videoAssetId}` : lesson.videoUrl || "";

  return (
    <div className="min-h-[calc(100vh-62px)] bg-[#050509]">
      {toast && (
        <div className="fixed bottom-6 left-1/2 z-[100] -translate-x-1/2 rounded-full border border-emerald-400/25 bg-[#0B1A16] px-4 py-2 text-[11px] text-emerald-200 shadow-xl">
          {toast}
        </div>
      )}

      <div className="border-b border-white/[0.06] bg-[#07080F]">
        <div className="flex flex-wrap items-center gap-3 px-4 py-3 sm:px-6">
          <Link href="/dashboard/courses" className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 text-[#9AA6BA] hover:text-white">
            <ArrowLeft size={14} />
          </Link>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[12px] font-medium text-white">{courseTitle}</p>
            <p className="text-[9.5px] text-[#6F7C90]">{lesson.title}</p>
          </div>
          <div className="hidden items-center gap-2 sm:flex">
            <div className="h-1.5 w-28 overflow-hidden rounded-full bg-white/10">
              <div className="h-full rounded-full bg-gradient-to-r from-[#873BFF] to-[#20D9E8]" style={{ width: `${progressPercent}%` }} />
            </div>
            <span className="num text-[10px] text-[#9AA6BA]">{progressPercent}%</span>
          </div>
          <button onClick={() => setSidebarOpen((v) => !v)} className="flex h-8 items-center gap-1.5 rounded-lg border border-white/10 px-2.5 text-[10px] text-[#C2CCDD] xl:hidden">
            Curriculum <ChevronRight size={11} />
          </button>
        </div>
      </div>

      <div className="grid xl:grid-cols-[1fr_348px]">
        <div className="min-w-0 p-4 sm:p-6">
          <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-black">
            {lesson.type === "VIDEO" && videoSrc ? (
              videoSrc.includes("youtube.com") || videoSrc.includes("youtu.be") || videoSrc.includes("vimeo.com") ? (
                <div className="aspect-video">
                  <iframe src={videoSrc} title={lesson.title} allow="autoplay; fullscreen; picture-in-picture" allowFullScreen className="h-full w-full" />
                </div>
              ) : (
                <video
                  ref={videoRef}
                  key={lesson.id}
                  controls
                  playsInline
                  preload="metadata"
                  poster="/brand/video-poster.png"
                  onTimeUpdate={onTimeUpdate}
                  onEnded={onEnded}
                  onLoadedMetadata={(e) => { if (watchedSeconds > 0) e.currentTarget.currentTime = Math.min(watchedSeconds, e.currentTarget.duration - 2 || 0); }}
                  className="aspect-video w-full bg-black"
                >
                  <source src={videoSrc} />
                  Your browser does not support video playback.
                </video>
              )
            ) : lesson.type === "PDF" && lesson.pdfAssetId ? (
              <div className="bg-[#0B0E18]">
                <div className="flex items-center justify-between gap-3 border-b border-white/[0.07] px-4 py-2.5">
                  <span className="flex items-center gap-2 text-[10.5px] text-[#C2CCDD]"><FileText size={13} className="text-[#20D9E8]" /> PDF learning material</span>
                  <a href={`/api/media/${lesson.pdfAssetId}`} download className="flex items-center gap-1.5 rounded-full border border-white/10 px-3 py-1 text-[10px] text-[#C2CCDD] hover:border-white/25">
                    <Download size={11} /> Download
                  </a>
                </div>
                <iframe src={`/api/media/${lesson.pdfAssetId}#toolbar=0&navpanes=0`} title={lesson.title} className="h-[65vh] w-full bg-[#1a1a1a]" />
              </div>
            ) : lesson.type === "TEXT" && lesson.content ? (
              <div className="prose-bs max-h-[70vh] overflow-y-auto bg-[#0B0E18] p-6">
                {lesson.content.split("\n").filter(Boolean).map((paragraph, i) => <p key={i}>{paragraph}</p>)}
              </div>
            ) : (
              <div className="flex aspect-video flex-col items-center justify-center gap-2 text-center">
                <Lock size={22} className="text-[#3F4A5C]" />
                <p className="text-[12px] text-[#8492A6]">This lesson has no media attached yet.</p>
                <p className="text-[10px] text-[#5F6B7E]">The academy has been notified.</p>
              </div>
            )}
          </div>

          <div className="mt-5 flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-[9.5px] uppercase tracking-[0.16em] text-[#6F7C90]">
                <span>{lesson.type}</span>
                <span className="h-1 w-1 rounded-full bg-[#3F4A5C]" />
                <span>{formatDuration(lesson.durationSeconds)}</span>
              </div>
              <h1 className="mt-2 text-[20px] font-semibold tracking-[-0.03em] text-white">{lesson.title}</h1>
              {lesson.description && <p className="mt-1.5 max-w-[640px] text-[12px] leading-relaxed text-[#8B98AD]">{lesson.description}</p>}
            </div>
            <button
              onClick={toggleComplete}
              disabled={saving}
              className={`btn btn-sm h-9 shrink-0 ${isCompleted ? "border border-emerald-400/25 bg-emerald-500/10 text-emerald-300" : "btn-light"}`}
            >
              {saving ? <Loader2 size={13} className="animate-spin" /> : isCompleted ? <><CheckCircle2 size={13} /> Completed</> : <><Circle size={13} /> Mark complete</>}
            </button>
          </div>

          <div className="mt-5 flex items-center justify-between border-t border-white/[0.06] pt-4">
            {prevLessonId ? (
              <Link href={`/dashboard/courses/${courseId}?lesson=${prevLessonId}`} className="btn btn-ghost btn-sm h-9"><ChevronLeft size={12} /> Previous</Link>
            ) : <span />}
            {nextLessonId ? (
              <Link href={`/dashboard/courses/${courseId}?lesson=${nextLessonId}`} className="btn btn-ghost btn-sm h-9">Next lesson <ChevronRight size={12} /></Link>
            ) : nextCourseLessonHref ? (
              <Link href={nextCourseLessonHref} className="btn btn-primary btn-sm h-9">Next course <ArrowRight size={12} /></Link>
            ) : (
              <Link href="/dashboard/assessments" className="btn btn-primary btn-sm h-9">Go to assessments <ArrowRight size={12} /></Link>
            )}
          </div>

          <div className="mt-6">
            <div className="flex gap-1 border-b border-white/[0.07]">
              {(["overview", "resources"] as const).map((key) => (
                <button
                  key={key}
                  onClick={() => setTab(key)}
                  className={`relative px-3 py-2 text-[11.5px] capitalize transition ${tab === key ? "text-white" : "text-[#6F7C90] hover:text-[#C2CCDD]"}`}
                >
                  {key}
                  {tab === key && <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-[#873BFF]" />}
                </button>
              ))}
            </div>

            {tab === "overview" ? (
              <div className="mt-4 rounded-xl border border-white/[0.06] bg-white/[0.015] p-4 text-[11.5px] leading-relaxed text-[#8B98AD]">
                <p>{lesson.description || "This lesson is part of the structured programme. Watch or read the material, then mark it complete to update your progress."}</p>
                <div className="mt-3 flex flex-wrap gap-3 text-[10px] text-[#6F7C90]">
                  <span className="inline-flex items-center gap-1.5"><PlayCircle size={11} /> Progress saves automatically</span>
                  <span className="inline-flex items-center gap-1.5"><Volume2 size={11} /> Use headphones for site recordings</span>
                  <span className="inline-flex items-center gap-1.5"><Maximize2 size={11} /> Fullscreen supported</span>
                </div>
              </div>
            ) : (
              <div className="mt-4 space-y-2">
                {lesson.pdfAssetId && (
                  <a href={`/api/media/${lesson.pdfAssetId}`} target="_blank" rel="noreferrer" className="flex items-center gap-3 rounded-xl border border-white/[0.07] bg-white/[0.02] p-3 hover:border-white/15">
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#20D9E8]/10 text-[#20D9E8]"><FileText size={14} /></span>
                    <div className="flex-1"><p className="text-[11.5px] text-white">Lesson PDF</p><p className="text-[9.5px] text-[#6F7C90]">Open or download the field guide</p></div>
                    <Download size={13} className="text-[#5F6B7E]" />
                  </a>
                )}
                {lesson.type === "VIDEO" && lesson.videoAssetId && (
                  <a href={`/api/media/${lesson.videoAssetId}`} download className="flex items-center gap-3 rounded-xl border border-white/[0.07] bg-white/[0.02] p-3 hover:border-white/15">
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#873BFF]/10 text-[#C9B8FF]"><Play size={14} /></span>
                    <div className="flex-1"><p className="text-[11.5px] text-white">Download lesson media</p><p className="text-[9.5px] text-[#6F7C90]">Save for offline viewing (where supported)</p></div>
                    <Download size={13} className="text-[#5F6B7E]" />
                  </a>
                )}
                <p className="px-1 pt-1 text-[10px] text-[#5F6B7E]">Additional resources are added by your instructor as the programme evolves.</p>
              </div>
            )}
          </div>
        </div>

        {/* curriculum sidebar */}
        <aside className={`${sidebarOpen ? "block" : "hidden"} border-t border-white/[0.06] bg-[#07080F] xl:sticky xl:top-[62px] xl:block xl:h-[calc(100vh-62px)] xl:overflow-y-auto xl:border-l xl:border-t-0`}>
          <div className="border-b border-white/[0.06] p-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#6F7C90]">Course content</p>
            <p className="mt-1 text-[10.5px] text-[#8492A6]">{modules.length} modules · {modules.reduce((s, m) => s + m.lessons.length, 0)} lessons</p>
          </div>

          <div className="p-2">
            {modules.map((module, mi) => {
              const hasActive = module.lessons.some((l) => l.id === activeLessonId);
              return (
                <details key={module.id} open={hasActive || mi === 0} className="group mb-1">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-2 rounded-lg px-2.5 py-2 hover:bg-white/[0.03] [&::-webkit-details-marker]:hidden">
                    <div className="flex min-w-0 items-center gap-2">
                      <span className="num text-[9px] text-[#5F6B7E]">{String(mi + 1).padStart(2, "0")}</span>
                      <span className="truncate text-[11px] font-medium text-[#C2CCDD]">{module.title}</span>
                    </div>
                    <ChevronRight size={12} className="shrink-0 text-[#4F5B6E] transition group-open:rotate-90" />
                  </summary>
                  <div className="mt-0.5 space-y-0.5 pb-1">
                    {module.lessons.map((item) => {
                      const active = item.id === activeLessonId;
                      return (
                        <Link
                          key={item.id}
                          href={`/dashboard/courses/${courseId}?lesson=${item.id}`}
                          className={`flex items-center gap-2 rounded-lg py-2 pl-7 pr-2 transition ${active ? "bg-[#873BFF]/12 text-white" : "text-[#8492A6] hover:bg-white/[0.03] hover:text-[#C2CCDD]"}`}
                        >
                          {item.type === "PDF" ? <FileText size={11} className="shrink-0 text-[#20D9E8]" /> : <PlayCircle size={11} className={`shrink-0 ${active ? "text-[#C9B8FF]" : "text-[#5F6B7E]"}`} />}
                          <span className="min-w-0 flex-1 truncate text-[10.5px]">{item.title}</span>
                          <span className="shrink-0 text-[8.5px] text-[#4F5B6E]">{item.durationSeconds ? `${Math.round(item.durationSeconds / 60)}m` : ""}</span>
                        </Link>
                      );
                    })}
                  </div>
                </details>
              );
            })}
          </div>

          {quizzes.length > 0 && (
            <div className="border-t border-white/[0.06] p-3">
              <p className="px-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#6F7C90]">Assessments</p>
              <div className="mt-2 space-y-1">
                {quizzes.map((quiz) => (
                  <Link key={quiz.id} href={`/dashboard/assessments/${quiz.id}`} className="flex items-center gap-2 rounded-lg border border-white/[0.06] bg-white/[0.02] p-2.5 hover:border-white/15">
                    <span className={`flex h-6 w-6 items-center justify-center rounded-md ${quiz.passed ? "bg-emerald-500/10 text-emerald-300" : "bg-[#873BFF]/12 text-[#C9B8FF]"}`}>
                      {quiz.passed ? <CheckCircle2 size={12} /> : <SparklesIcon />}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[10.5px] text-white">{quiz.title}</p>
                      <p className="text-[8.5px] text-[#6F7C90]">{quiz.type === "EXAM" ? "Final exam" : "Quiz"} · {quiz.questionCount} questions</p>
                    </div>
                    <ArrowRight size={11} className="text-[#4F5B6E]" />
                  </Link>
                ))}
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

function SparklesIcon() {
  return <span className="text-[10px]">✦</span>;
}
