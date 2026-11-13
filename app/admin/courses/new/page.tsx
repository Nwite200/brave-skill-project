import type { Metadata } from "next";
import Link from "next/link";
import { requireStaffPage, isAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { CourseForm } from "@/components/admin/CourseForm";

export const metadata: Metadata = { title: "New course · Admin" };
export const dynamic = "force-dynamic";

export default async function NewCoursePage() {
  const user = await requireStaffPage();
  const [categories, instructors] = await Promise.all([
    db.category.findMany({ where: { isActive: true }, orderBy: { position: "asc" }, select: { id: true, name: true } }),
    db.user.findMany({ where: { role: "INSTRUCTOR", status: "ACTIVE" }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);

  if (!categories.length) {
    return (
      <div className="mx-auto max-w-lg py-16 text-center">
        <h1 className="text-[20px] font-semibold text-white">Create a category first</h1>
        <p className="mt-2 text-[12px] leading-relaxed text-[#8492A6]">Courses must belong to a category. Add the career tracks your academy offers, then return to create a course.</p>
        <Link href="/admin/categories" className="btn btn-primary mt-5">Go to categories</Link>
      </div>
    );
  }

  return (
    <CourseForm
      categories={categories.map((c) => ({ value: c.id, label: c.name }))}
      instructors={isAdmin(user.role) ? instructors.map((i) => ({ value: i.id, label: i.name })) : [{ value: user.id, label: user.name }]}
      canPublish={isAdmin(user.role)}
    />
  );
}
