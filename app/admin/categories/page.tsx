import type { Metadata } from "next";
import { db } from "@/lib/db";
import { requireAdminPage } from "@/lib/auth";
import { CrudPanel } from "@/components/admin/CrudPanel";

export const metadata: Metadata = { title: "Categories · Admin" };
export const dynamic = "force-dynamic";

export default async function AdminCategoriesPage() {
  await requireAdminPage();
  const categories = await db.category.findMany({
    orderBy: { position: "asc" },
    include: { _count: { select: { courses: true } } },
  });

  return (
    <div className="mx-auto max-w-[1100px]">
      <CrudPanel
        resource="categories"
        title="Course categories"
        description="Organise the catalogue into career tracks. Categories power the website filters and the Android app catalogue."
        createLabel="New category"
        fields={[
          { name: "name", label: "Name", type: "text", required: true, placeholder: "Solar & Inverter" },
          { name: "slug", label: "Slug", type: "text", help: "Leave blank to generate from the name." },
          { name: "description", label: "Description", type: "textarea", full: true },
          { name: "icon", label: "Icon key", type: "text", placeholder: "solar | cctv | electrical | networking | access" },
          { name: "accent", label: "Accent colour", type: "text", placeholder: "#873BFF" },
          { name: "position", label: "Position", type: "number", defaultValue: 0 },
          { name: "isActive", label: "Visible on website", type: "checkbox", defaultValue: true },
        ]}
        columns={[
          { key: "name", label: "Category" },
          { key: "slug", label: "Slug", className: "font-mono text-[10.5px] text-[#8492A6]" },
          { key: "courses", label: "Courses", kind: "number" },
          { key: "position", label: "Order", kind: "number" },
          { key: "isActive", label: "Active", kind: "boolean" },
        ]}
        rows={categories.map((c) => ({ ...c, courses: c._count.courses }))}
      />
    </div>
  );
}
