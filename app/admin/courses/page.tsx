import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, BookOpen, Plus, Search, Users } from "lucide-react";
import { requireStaffPage, isAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatNaira, formatDate, levelLabel } from "@/lib/format";
import { CoursePublishToggle } from "@/components/admin/CoursePublishToggle";

export const metadata: Metadata = { title: "Courses · Admin" };
export const dynamic = "force-dynamic";

export default async function AdminCoursesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  const user = await requireStaffPage();
  const admin = isAdmin(user.role);
  const params = await searchParams;

  const where = {
    ...(!admin ? { instructorId: user.id } : {}),
    ...(params.q ? { title: { contains: params.q, mode: "insensitive" as const } } : {}),
    ...(params.status === "published" ? { isPublished: true } : params.status === "draft" ? { isPublished: false } : {}),
  };

  const courses = await db.course.findMany({
    where,
    orderBy: { updatedAt: "desc" },
    include: {
      category: { select: { name: true } },
      instructor: { select: { name: true } },
      _count: { select: { enrollments: true, modules: true } },
    },
  });

  return (
    <div className="mx-auto max-w-[1220px]">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-[#455063]">Academy / courses</p>
          <h1 className="mt-1.5 text-[22px] font-semibold tracking-[-0.03em] text-white">Course catalogue</h1>
          <p className="mt-1 text-[11.5px] text-[#8492A6]">{courses.length} courses · publishing pushes instantly to the website and Android app.</p>
        </div>
        <Link href="/admin/courses/new" className="btn btn-primary btn-sm h-9"><Plus size={12} /> New course</Link>
      </div>

      <form className="mt-4 flex flex-wrap items-center gap-2">
        <div className="flex flex-1 items-center gap-2 rounded-lg border border-white/[0.08] bg-white/[0.02] px-3 py-2">
          <Search size={13} className="text-[#5F6B7E]" />
          <input name="q" defaultValue={params.q} placeholder="Search courses" className="w-full bg-transparent text-[11.5px] text-white outline-none placeholder:text-[#3F4A5C]" />
        </div>
        <select name="status" defaultValue={params.status || ""} className="field h-9 w-auto min-w-[130px] text-[11px]">
          <option value="">All statuses</option>
          <option value="published">Published</option>
          <option value="draft">Draft</option>
        </select>
        <button className="btn btn-ghost btn-sm h-9">Filter</button>
      </form>

      <div className="mt-4 table-wrap">
        <table className="data">
          <thead>
            <tr>
              <th>Course</th>
              <th>Track</th>
              <th>Price</th>
              <th>Students</th>
              <th>Modules</th>
              <th>Status</th>
              <th>Updated</th>
              <th className="text-right">Open</th>
            </tr>
          </thead>
          <tbody>
            {courses.map((course) => (
              <tr key={course.id}>
                <td>
                  <Link href={`/admin/courses/${course.id}`} className="font-medium text-white hover:text-[#C9B8FF]">{course.title}</Link>
                  <p className="mt-0.5 text-[9px] text-[#5F6B7E]">{course.instructor?.name || "Unassigned"} · {levelLabel[course.level]}</p>
                </td>
                <td className="text-[11px]">{course.category.name}</td>
                <td className="num">{course.priceKobo === 0 ? "Free" : formatNaira(course.priceKobo)}</td>
                <td><span className="inline-flex items-center gap-1"><Users size={10} className="text-[#5F6B7E]" /> {course._count.enrollments}</span></td>
                <td><span className="inline-flex items-center gap-1"><BookOpen size={10} className="text-[#5F6B7E]" /> {course._count.modules}</span></td>
                <td><CoursePublishToggle courseId={course.id} isPublished={course.isPublished} isFeatured={course.isFeatured} canPublish={admin} /></td>
                <td className="text-[10px] text-[#6F7C90]">{formatDate(course.updatedAt)}</td>
                <td className="text-right">
                  <Link href={`/admin/courses/${course.id}`} className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-white/10 text-[#8492A6] hover:text-white"><ArrowUpRight size={11} /></Link>
                </td>
              </tr>
            ))}
            {!courses.length && <tr><td colSpan={8} className="py-12 text-center text-[11.5px] text-[#6F7C90]">No courses found. Create your first programme.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
