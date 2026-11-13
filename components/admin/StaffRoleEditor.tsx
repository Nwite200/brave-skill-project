"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Loader2 } from "lucide-react";

export function StaffRoleEditor({
  userId,
  role,
  canEdit,
}: {
  userId: string;
  role: string;
  canEdit: boolean;
}) {
  const router = useRouter();
  const [value, setValue] = useState(role);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const change = async (next: string) => {
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: next }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not change the role.");
      setValue(next);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not change the role.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <select
        value={value}
        disabled={!canEdit || busy}
        onChange={(e) => change(e.target.value)}
        className="field h-7 w-[140px] text-[9.5px]"
      >
        <option value="STUDENT">Student</option>
        <option value="INSTRUCTOR">Instructor</option>
        <option value="ADMIN">Administrator</option>
        <option value="MASTER_ADMIN">Master admin</option>
      </select>
      {busy && <Loader2 size={11} className="animate-spin text-[#8492A6]" />}
      {error && <span className="text-[9px] text-rose-300">{error}</span>}
    </div>
  );
}
