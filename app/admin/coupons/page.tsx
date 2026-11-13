import type { Metadata } from "next";
import { db } from "@/lib/db";
import { requireAdminPage } from "@/lib/auth";
import { CrudPanel } from "@/components/admin/CrudPanel";
import { toNaira } from "@/lib/format";

export const metadata: Metadata = { title: "Discount codes · Admin" };
export const dynamic = "force-dynamic";

export default async function AdminCouponsPage() {
  await requireAdminPage();
  const [coupons, courses] = await Promise.all([
    db.coupon.findMany({ orderBy: { createdAt: "desc" }, include: { course: { select: { title: true } } } }),
    db.course.findMany({ orderBy: { title: "asc" }, select: { id: true, title: true } }),
  ]);

  return (
    <div className="mx-auto max-w-[1180px]">
      <CrudPanel
        resource="coupons"
        title="Discount codes"
        description="Percentage or fixed discounts, optionally limited to a course. Usage is counted when a verified payment completes."
        createLabel="New code"
        fields={[
          { name: "code", label: "Code", type: "text", required: true, placeholder: "BRAVE20" },
          { name: "description", label: "Description", type: "text" },
          { name: "type", label: "Type", type: "select", required: true, options: [{ value: "PERCENT", label: "Percentage off" }, { value: "FIXED", label: "Fixed amount off" }], defaultValue: "PERCENT" },
          { name: "percentOff", label: "Percent off", type: "number", help: "Used when type is percentage." },
          { name: "amountOffNaira", label: "Amount off (₦)", type: "number", help: "Used when type is fixed." },
          { name: "courseId", label: "Restrict to course", type: "select", options: [{ value: "", label: "All courses" }, ...courses.map((c) => ({ value: c.id, label: c.title }))] },
          { name: "maxUses", label: "Max uses", type: "number", help: "0 = unlimited" },
          { name: "minAmountNaira", label: "Minimum order (₦)", type: "number" },
          { name: "startsAt", label: "Starts", type: "date" },
          { name: "expiresAt", label: "Expires", type: "date" },
          { name: "isActive", label: "Active", type: "checkbox", defaultValue: true },
        ]}
        columns={[
          { key: "code", label: "Code", className: "font-mono text-[11px] text-white" },
          { key: "type", label: "Type", kind: "badge" },
          { key: "discount", label: "Discount" },
          { key: "courseName", label: "Scope" },
          { key: "uses", label: "Used", kind: "number" },
          { key: "expiresAt", label: "Expires", kind: "date" },
          { key: "isActive", label: "Active", kind: "boolean" },
        ]}
        rows={coupons.map((c) => ({
          ...c,
          amountOffNaira: toNaira(c.amountOffKobo),
          courseName: c.course?.title || "All courses",
          discount: c.type === "PERCENT" ? `${c.percentOff}%` : `₦${toNaira(c.amountOffKobo).toLocaleString()}`,
          startsAt: c.startsAt?.toISOString() || "",
          expiresAt: c.expiresAt?.toISOString() || "",
        }))}
      />
    </div>
  );
}
