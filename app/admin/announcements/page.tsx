import type { Metadata } from "next";
import { db } from "@/lib/db";
import { requireAdminPage } from "@/lib/auth";
import { CrudPanel } from "@/components/admin/CrudPanel";

export const metadata: Metadata = { title: "Announcements · Admin" };
export const dynamic = "force-dynamic";

export default async function AdminAnnouncementsPage() {
  await requireAdminPage();
  const [announcements, courses] = await Promise.all([
    db.announcement.findMany({ orderBy: { createdAt: "desc" }, include: { course: { select: { title: true } } } }),
    db.course.findMany({ orderBy: { title: "asc" }, select: { id: true, title: true } }),
  ]);

  return (
    <div className="mx-auto max-w-[1100px]">
      <CrudPanel
        resource="announcements"
        title="Announcements"
        description="Publish updates to all students, students only, or the learners on a specific course. Publishing sends an in-app notification."
        createLabel="New announcement"
        fields={[
          { name: "title", label: "Title", type: "text", required: true, full: true },
          { name: "body", label: "Message", type: "textarea", required: true, full: true },
          { name: "audience", label: "Audience", type: "select", required: true, options: [{ value: "ALL", label: "Everyone" }, { value: "STUDENTS", label: "All students" }, { value: "COURSE", label: "A specific course" }], defaultValue: "STUDENTS" },
          { name: "courseId", label: "Course (if audience is course)", type: "select", options: courses.map((c) => ({ value: c.id, label: c.title })) },
          { name: "isPublished", label: "Published", type: "checkbox", defaultValue: true },
        ]}
        columns={[
          { key: "title", label: "Title" },
          { key: "audience", label: "Audience", kind: "badge" },
          { key: "courseName", label: "Course" },
          { key: "isPublished", label: "Live", kind: "boolean" },
          { key: "createdAt", label: "Created", kind: "date" },
        ]}
        rows={announcements.map((a) => ({ ...a, courseName: a.course?.title || "—", createdAt: a.createdAt.toISOString() }))}
      />
    </div>
  );
}
