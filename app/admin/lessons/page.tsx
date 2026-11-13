import type { Metadata } from "next";
import { db } from "@/lib/db";
import { requireStaffPage, isAdmin } from "@/lib/auth";
import { CrudPanel } from "@/components/admin/CrudPanel";

export const metadata: Metadata = { title: "Lessons · Admin" };
export const dynamic = "force-dynamic";

export default async function AdminLessonsPage() {
  const user = await requireStaffPage();
  const admin = isAdmin(user.role);

  const modules = await db.module.findMany({
    where: admin ? {} : { course: { instructorId: user.id } },
    orderBy: [{ course: { title: "asc" } }, { position: "asc" }],
    select: { id: true, title: true, course: { select: { title: true } } },
  });
  const lessons = await db.lesson.findMany({
    where: admin ? {} : { module: { course: { instructorId: user.id } } },
    orderBy: [{ module: { course: { title: "asc" } } }, { position: "asc" }],
    include: { module: { select: { title: true, course: { select: { title: true } } } } },
  });

  return (
    <div className="mx-auto max-w-[1180px]">
      <CrudPanel
        resource="lessons"
        title="Lessons"
        description="Manage text lessons and metadata. Video and PDF uploads live in the course curriculum builder for secure, entitlement-checked streaming."
        createLabel="New lesson"
        fields={[
          { name: "moduleId", label: "Module", type: "select", required: true, full: true, options: modules.map((m) => ({ value: m.id, label: `${m.course.title} · ${m.title}` })) },
          { name: "title", label: "Lesson title", type: "text", required: true, full: true },
          { name: "type", label: "Type", type: "select", options: [{ value: "VIDEO", label: "Video" }, { value: "PDF", label: "PDF" }, { value: "TEXT", label: "Text" }], defaultValue: "VIDEO" },
          { name: "durationSeconds", label: "Duration (seconds)", type: "number" },
          { name: "videoUrl", label: "Video URL", type: "text", help: "Hosted video link. Uploads are done in the course builder.", full: true },
          { name: "content", label: "Text content", type: "textarea", full: true },
          { name: "isPreview", label: "Free preview", type: "checkbox" },
          { name: "isPublished", label: "Published", type: "checkbox", defaultValue: true },
        ]}
        columns={[
          { key: "title", label: "Lesson" },
          { key: "courseName", label: "Course" },
          { key: "moduleName", label: "Module" },
          { key: "type", label: "Type", kind: "badge" },
          { key: "durationSeconds", label: "Duration", kind: "number" },
          { key: "isPreview", label: "Preview", kind: "boolean" },
          { key: "isPublished", label: "Live", kind: "boolean" },
        ]}
        rows={lessons.map((lesson) => ({
          ...lesson,
          courseName: lesson.module.course.title,
          moduleName: lesson.module.title,
        }))}
      />
    </div>
  );
}
