import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireStaffPage, isAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { QuestionEditor } from "@/components/admin/QuestionEditor";

export const metadata: Metadata = { title: "Assessment editor · Admin" };
export const dynamic = "force-dynamic";

export default async function AdminExamDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireStaffPage();
  const admin = isAdmin(user.role);
  const { id } = await params;

  const quiz = await db.quiz.findUnique({
    where: { id },
    include: { course: { select: { id: true, title: true, instructorId: true } }, questions: { orderBy: { position: "asc" } } },
  });
  if (!quiz) notFound();
  if (!admin && quiz.course.instructorId !== user.id) notFound();

  return (
    <div className="mx-auto max-w-[900px]">
      <Link href="/admin/examinations" className="inline-flex items-center gap-1.5 text-[10.5px] text-[#8492A6] hover:text-white"><ArrowLeft size={12} /> All assessments</Link>

      <div className="mt-4 rounded-xl border border-white/[0.07] bg-[#0A0C15] p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-[#455063]">{quiz.type} · {quiz.course.title}</p>
            <h1 className="mt-1 text-[20px] font-semibold tracking-[-0.02em] text-white">{quiz.title}</h1>
            {quiz.description && <p className="mt-1 max-w-[520px] text-[11px] text-[#8492A6]">{quiz.description}</p>}
          </div>
          <div className="flex gap-2 text-center">
            {[
              { label: "Pass", value: `${quiz.passMark}%` },
              { label: "Time", value: quiz.timeLimitMinutes ? `${quiz.timeLimitMinutes}m` : "∞" },
              { label: "Attempts", value: quiz.maxAttempts || "∞" },
            ].map((stat) => (
              <div key={stat.label} className="rounded-lg border border-white/[0.06] px-3 py-1.5">
                <p className="num text-[12px] font-semibold text-white">{stat.value}</p>
                <p className="text-[7.5px] uppercase tracking-[0.1em] text-[#6F7C90]">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-4">
        <QuestionEditor
          quizId={quiz.id}
          questions={quiz.questions.map((q) => ({
            id: q.id,
            prompt: q.prompt,
            options: JSON.parse(q.options) as string[],
            correctIndex: q.correctIndex,
            explanation: q.explanation,
            points: q.points,
          }))}
        />
      </div>

      <p className="mt-4 rounded-lg border border-white/[0.06] bg-white/[0.02] p-3 text-[9.5px] leading-relaxed text-[#6F7C90]">
        Learner-facing behaviour: final exams require every lesson to be complete; passing issues the certificate immediately. Time limits are enforced on the server with a 90-second network grace period.
      </p>
    </div>
  );
}
