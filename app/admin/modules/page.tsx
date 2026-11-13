import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import { requireStaffPage, isAdmin } from "@/lib/auth";
import { CrudPanel } from "@/components/admin/CrudPanel";

export const metadata: Metadata = { title: "Modules · Admin" };
export const dynamic = "force-dynamic";

export default async function AdminModulesPage() {
  const user = await requireStaffPage();
  const admin = isAdmin(user.role);

  const courses = await db.course.findMany({
    where: admin ? {} : { instructorId: user.id },
    orderBy: { title: "asc" },
    select: { id: true, title: true },
  });
  const modules = await db.module.findMany({
    where: admin ? {} : { course: { instructorId: user.id } },
    orderBy: [{ course: { title: "asc" } }, { position: "asc" }],
    include: { course: { select: { title: true } }, _count: { select: { lessons: true } } },
  });

  return (
    <div className="mx-auto max-w-[1100px]">
      <div className="mb-4 rounded-xl border border-[#873BFF]/20 bg-[#873BFF]/[0.05] px-4 py-3 text-[10.5px] leading-relaxed text-[#A9B4C6]">
        Modules group lessons inside a course. For the full curriculum builder — including video and PDF uploads — open a course from{" "}
        <Link href="/admin/courses" className="text-[#C9B8FF] underline-offset-2 hover:underline">Courses</Link>.
      </div>
      <CrudPanel
        resource="modules"
        title="Modules"
        description="Quickly create or reorder modules across the academy."
        createLabel="New module"
        fields={[
          { name: "courseId", label: "Course", type: "select", required: true, options: courses.map((c) => ({ value: c.id, label: c.title })), full: true },
          { name: "title", label: "Module title", type: "text", required: true, full: true },
          { name: "description", label: "Description", type: "textarea", full: true },
          { name: "position", label: "Position", type: "number", defaultValue: 0 },
          { name: "isPublished", label: "Published", type: "checkbox", defaultValue: true },
        ]}
        columns={[
          { key: "title", label: "Module" },
          { key: "courseName", label: "Course" },
          { key: "position", label: "Order", kind: "number" },
          { key: "lessons", label: "Lessons", kind: "number" },
          { key: "isPublished", label: "Live", kind: "boolean" },
        ]}
        rows={modules.map((m) => ({ ...m, courseName: m.course.title, lessons: m._count.lessons }))}
      />
    </div>
  );
}
