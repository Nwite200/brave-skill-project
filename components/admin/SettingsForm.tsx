"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { CheckCircle2, Loader2, Save } from "lucide-react";

export type SettingsField = {
  key: string;
  label: string;
  type?: "text" | "textarea";
  help?: string;
  full?: boolean;
};

export function SettingsForm({
  settings,
  groups,
}: {
  settings: Record<string, string>;
  groups: { title: string; fields: SettingsField[] }[];
}) {
  const router = useRouter();
  const [values, setValues] = useState<Record<string, string>>(settings);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [active, setActive] = useState(groups[0]?.title || "");

  const save = async () => {
    setSaving(true);
    setMessage("");
    setError("");
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not save settings.");
      setMessage("Website settings saved.");
      router.refresh();
      setTimeout(() => setMessage(""), 3000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save settings.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-xl border border-white/[0.07] bg-[#0A0C15]">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.06] px-4 py-3">
        <div className="flex flex-wrap gap-1">
          {groups.map((group) => (
            <button key={group.title} onClick={() => setActive(group.title)} className={`rounded-md px-2.5 py-1.5 text-[10px] transition ${active === group.title ? "bg-white/[0.07] text-white" : "text-[#6F7C90] hover:text-white"}`}>
              {group.title}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          {message && <span className="flex items-center gap-1 text-[10px] text-emerald-300"><CheckCircle2 size={11} /> {message}</span>}
          {error && <span className="text-[10px] text-rose-300">{error}</span>}
          <button onClick={save} disabled={saving} className="btn btn-primary btn-sm h-8">
            {saving ? <Loader2 size={11} className="animate-spin" /> : <><Save size={11} /> Save</>}
          </button>
        </div>
      </div>

      {groups.filter((g) => g.title === active).map((group) => (
        <div key={group.title} className="grid gap-4 p-4 sm:grid-cols-2">
          {group.fields.map((field) => (
            <div key={field.key} className={field.full ? "sm:col-span-2" : ""}>
              <label htmlFor={field.key} className="label">{field.label}</label>
              {field.type === "textarea" ? (
                <textarea id={field.key} rows={3} className="field text-[11.5px]" value={values[field.key] || ""} onChange={(e) => setValues({ ...values, [field.key]: e.target.value })} />
              ) : (
                <input id={field.key} className="field h-9 text-[11.5px]" value={values[field.key] || ""} onChange={(e) => setValues({ ...values, [field.key]: e.target.value })} />
              )}
              {field.help && <p className="mt-1 text-[9px] text-[#5F6B7E]">{field.help}</p>}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
