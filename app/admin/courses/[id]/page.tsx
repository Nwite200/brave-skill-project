import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireStaffPage, isAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { CourseForm } from "@/components/admin/CourseForm";
import { CurriculumBuilder } from "@/components/admin/CurriculumBuilder";
import { formatNaira, statusTone } from "@/lib/format";
import { toNaira } from "@/lib/format";

export const metadata: Metadata = { title: "Edit course · Admin" };
export const dynamic = "force-dynamic";

export default async function EditCoursePage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireStaffPage();
  const admin = isAdmin(user.role);
  const { id } = await params;

  const course = await db.course.findUnique({
    where: { id },
    include: {
      modules: {
        orderBy: { position: "asc" },
        include: {
          lessons: {
            orderBy: { position: "asc" },
            include: { videoAsset: { select: { originalName: true } }, pdfAsset: { select: { originalName: true } } },
          },
        },
      },
      quizzes: { orderBy: { createdAt: "asc" }, include: { _count: { select: { questions: true } } } },
      _count: { select: { enrollments: true, certificates: true } },
    },
  });
  if (!course) notFound();
  if (!admin && course.instructorId !== user.id) notFound();

  const [categories, instructors, revenue, recentStudents] = await Promise.all([
    db.category.findMany({ where: { isActive: true }, orderBy: { position: "asc" }, select: { id: true, name: true } }),
    db.user.findMany({ where: { role: "INSTRUCTOR", status: "ACTIVE" }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
    db.order.aggregate({ where: { courseId: course.id, status: "PAID" }, _sum: { amountKobo: true } }),
    db.enrollment.findMany({
      where: { courseId: course.id },
      orderBy: { enrolledAt: "desc" },
      take: 5,
      include: { user: { select: { name: true, email: true } } },
    }),
  ]);

  return (
    <div>
      <CourseForm
        canPublish={admin}
        initial={{
          id: course.id,
          title: course.title,
          slug: course.slug,
          subtitle: course.subtitle,
          summary: course.summary,
          description: course.description,
          outcomes: course.outcomes,
          requirements: course.requirements,
          categoryId: course.categoryId,
          instructorId: course.instructorId,
          level: course.level,
          priceNaira: toNaira(course.priceKobo),
          compareAtNaira: toNaira(course.compareAtKobo),
          thumbnailUrl: course.thumbnailUrl,
          promoVideoUrl: course.promoVideoUrl,
          durationLabel: course.durationLabel,
          certificateEnabled: course.certificateEnabled,
          examRequired: course.examRequired,
          passMark: course.passMark,
          isPublished: course.isPublished,
          isFeatured: course.isFeatured,
        }}
        categories={categories.map((c) => ({ value: c.id, label: c.name }))}
        instructors={instructors.map((i) => ({ value: i.id, label: i.name }))}
      >
        <CurriculumBuilder
          courseId={course.id}
          modules={course.modules.map((m) => ({
            id: m.id,
            title: m.title,
            description: m.description,
            position: m.position,
            isPublished: m.isPublished,
            lessons: m.lessons.map((l) => ({
              id: l.id,
              title: l.title,
              type: l.type,
              durationSeconds: l.durationSeconds,
              isPreview: l.isPreview,
              isPublished: l.isPublished,
              videoAssetId: l.videoAssetId,
              pdfAssetId: l.pdfAssetId,
              videoUrl: l.videoUrl,
              content: l.content,
              description: l.description,
              videoName: l.videoAsset?.originalName || null,
              pdfName: l.pdfAsset?.originalName || null,
            })),
          }))}
          quizzes={course.quizzes.map((q) => ({
            id: q.id,
            title: q.title,
            type: q.type,
            passMark: q.passMark,
            questions: q._count.questions,
            isPublished: q.isPublished,
          }))}
        />

        <div className="mx-auto mt-8 grid max-w-[1180px] gap-4 sm:grid-cols-3">
          {[
            { label: "Enrolments", value: String(course._count.enrollments) },
            { label: "Certificates", value: String(course._count.certificates) },
            { label: "Revenue", value: formatNaira(revenue._sum.amountKobo || 0) },
          ].map((stat) => (
            <div key={stat.label} className="rounded-xl border border-white/[0.07] bg-[#0A0C15] p-4">
              <p className="text-[9px] uppercase tracking-[0.16em] text-[#6F7C90]">{stat.label}</p>
              <p className="num mt-1 text-[18px] font-semibold text-white">{stat.value}</p>
            </div>
          ))}
        </div>

        <div className="mx-auto mt-4 max-w-[1180px] rounded-xl border border-white/[0.07] bg-[#0A0C15] p-4">
          <div className="flex items-center justify-between">
            <p className="text-[9px] uppercase tracking-[0.16em] text-[#6F7C90]">Recent enrolments</p>
            <Link href="/admin/students" className="text-[9px] text-[#C9B8FF] hover:text-white">Manage students →</Link>
          </div>
          <div className="mt-2 space-y-1.5">
            {recentStudents.map((enrollment) => (
              <div key={enrollment.id} className="flex items-center justify-between gap-3 rounded-lg border border-white/[0.05] px-3 py-2">
                <div className="min-w-0">
                  <p className="truncate text-[10.5px] text-white">{enrollment.user.name}</p>
                  <p className="truncate text-[9px] text-[#5F6B7E]">{enrollment.user.email}</p>
                </div>
                <span className={`rounded-full border px-1.5 py-0.5 text-[8px] uppercase ${statusTone[enrollment.status] || "border-white/10 text-[#8492A6]"}`}>{enrollment.status}</span>
              </div>
            ))}
            {!recentStudents.length && <p className="text-[10px] text-[#5F6B7E]">No enrolments yet.</p>}
          </div>
        </div>
      </CourseForm>
    </div>
  );
}
