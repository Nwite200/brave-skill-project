"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { AlertCircle, CheckCircle2, Loader2, Pencil, Plus, Search, Trash2, X } from "lucide-react";
import { formatDate, formatNaira } from "@/lib/format";

export type CrudField = {
  name: string;
  label: string;
  type: "text" | "textarea" | "number" | "select" | "checkbox" | "date" | "money" | "email";
  options?: { value: string; label: string }[];
  placeholder?: string;
  help?: string;
  required?: boolean;
  full?: boolean;
  defaultValue?: string | number | boolean;
};

export type CrudColumn = {
  key: string;
  label: string;
  kind?: "text" | "money" | "date" | "boolean" | "badge" | "number";
  className?: string;
};

type Row = Record<string, unknown>;

export function CrudPanel({
  resource,
  title,
  description,
  fields,
  columns,
  rows: initialRows,
  createLabel = "Add record",
  searchable = true,
  emptyMessage = "No records yet.",
}: {
  resource: string;
  title: string;
  description?: string;
  fields: CrudField[];
  columns: CrudColumn[];
  rows: Row[];
  createLabel?: string;
  searchable?: boolean;
  emptyMessage?: string;
}) {
  const router = useRouter();
  const [rows, setRows] = useState<Row[]>(initialRows);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Row | null>(null);
  const [values, setValues] = useState<Record<string, unknown>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [query, setQuery] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<Row | null>(null);

  const filtered = useMemo(() => {
    if (!query.trim()) return rows;
    const needle = query.toLowerCase();
    return rows.filter((row) => JSON.stringify(row).toLowerCase().includes(needle));
  }, [rows, query]);

  const openCreate = () => {
    const initial: Record<string, unknown> = {};
    for (const field of fields) {
      if (field.defaultValue !== undefined) initial[field.name] = field.defaultValue;
      else if (field.type === "checkbox") initial[field.name] = false;
      else initial[field.name] = "";
    }
    setValues(initial);
    setEditing(null);
    setError("");
    setSuccess("");
    setOpen(true);
  };

  const openEdit = (row: Row) => {
    const initial: Record<string, unknown> = {};
    for (const field of fields) {
      const raw = row[field.name];
      if (field.type === "money") initial[field.name] = raw ? Number(raw) / 100 : 0;
      else if (field.type === "date") initial[field.name] = raw ? String(raw).slice(0, 10) : "";
      else if (field.type === "checkbox") initial[field.name] = Boolean(raw);
      else initial[field.name] = raw ?? "";
    }
    setValues(initial);
    setEditing(row);
    setError("");
    setSuccess("");
    setOpen(true);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const payload: Record<string, unknown> = { ...values };
      for (const field of fields) {
        if (field.type === "number" || field.type === "money") payload[field.name] = Number(payload[field.name] || 0);
        if (field.type === "checkbox") payload[field.name] = Boolean(payload[field.name]);
        if (field.type === "select" && payload[field.name] === "") payload[field.name] = "";
      }
      const id = editing?.id ? String(editing.id) : null;
      const res = await fetch(`/api/admin/content/${resource}${id ? `/${id}` : ""}`, {
        method: id ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Could not save this record.");
        setSaving(false);
        return;
      }
      const record = data.record as Row;
      setRows((prev) => {
        const normalized = { ...record, ...flattenRecord(record) };
        if (id) return prev.map((row) => (row.id === id ? { ...row, ...normalized } : row));
        return [normalized, ...prev];
      });
      setSuccess(id ? "Record updated." : "Record created.");
      setOpen(false);
      router.refresh();
      setTimeout(() => setSuccess(""), 3000);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget?.id) return;
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/content/${resource}/${deleteTarget.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Could not delete this record.");
        setSaving(false);
        setDeleteTarget(null);
        return;
      }
      setRows((prev) => prev.filter((row) => row.id !== deleteTarget.id));
      setDeleteTarget(null);
      setSuccess("Record deleted.");
      router.refresh();
      setTimeout(() => setSuccess(""), 3000);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[21px] font-semibold tracking-[-0.03em] text-white">{title}</h1>
          {description && <p className="mt-1 max-w-[560px] text-[11.5px] text-[#8492A6]">{description}</p>}
        </div>
        <div className="flex items-center gap-2">
          {searchable && (
            <div className="flex items-center gap-1.5 rounded-lg border border-white/[0.08] bg-white/[0.02] px-2.5 py-1.5">
              <Search size={12} className="text-[#5F6B7E]" />
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Filter…" className="w-[120px] bg-transparent text-[10.5px] text-white outline-none placeholder:text-[#3F4A5C]" />
            </div>
          )}
          <button onClick={openCreate} className="btn btn-primary btn-sm h-8"><Plus size={12} /> {createLabel}</button>
        </div>
      </div>

      {success && <p className="mt-4 flex items-center gap-2 rounded-lg border border-emerald-400/20 bg-emerald-500/10 px-3 py-2 text-[11px] text-emerald-200"><CheckCircle2 size={12} /> {success}</p>}
      {error && !open && <p className="mt-4 flex items-center gap-2 rounded-lg border border-rose-400/20 bg-rose-500/10 px-3 py-2 text-[11px] text-rose-200"><AlertCircle size={12} /> {error}</p>}

      <div className="mt-4 table-wrap">
        <table className="data">
          <thead>
            <tr>
              {columns.map((col) => <th key={col.key}>{col.label}</th>)}
              <th className="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((row, index) => (
              <tr key={String(row.id || index)}>
                {columns.map((col) => (
                  <td key={col.key} className={col.className}>
                    <Cell value={row[col.key]} kind={col.kind} />
                  </td>
                ))}
                <td className="text-right">
                  <div className="inline-flex gap-1">
                    <button onClick={() => openEdit(row)} aria-label="Edit" className="flex h-7 w-7 items-center justify-center rounded-md border border-white/10 text-[#8492A6] hover:border-white/25 hover:text-white"><Pencil size={11} /></button>
                    <button onClick={() => setDeleteTarget(row)} aria-label="Delete" className="flex h-7 w-7 items-center justify-center rounded-md border border-white/10 text-[#8492A6] hover:border-rose-400/40 hover:text-rose-300"><Trash2 size={11} /></button>
                  </div>
                </td>
              </tr>
            ))}
            {!filtered.length && <tr><td colSpan={columns.length + 1} className="py-10 text-center text-[11.5px] text-[#6F7C90]">{emptyMessage}</td></tr>}
          </tbody>
        </table>
      </div>

      {open && (
        <div className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto bg-black/75 p-4 backdrop-blur-sm sm:p-8">
          <form onSubmit={submit} className="w-full max-w-[620px] rounded-2xl border border-white/[0.1] bg-[#0A0C15]">
            <div className="flex items-center justify-between border-b border-white/[0.07] px-5 py-3.5">
              <div>
                <h2 className="text-[13px] font-semibold text-white">{editing ? "Edit record" : createLabel}</h2>
                <p className="text-[9px] uppercase tracking-[0.14em] text-[#5F6B7E]">{resource}</p>
              </div>
              <button type="button" onClick={() => setOpen(false)} aria-label="Close" className="text-[#6F7C90] hover:text-white"><X size={16} /></button>
            </div>

            <div className="max-h-[65vh] overflow-y-auto p-5">
              {error && <p className="mb-4 rounded-lg border border-rose-400/20 bg-rose-500/10 px-3 py-2 text-[11px] text-rose-200">{error}</p>}
              <div className="grid gap-4 sm:grid-cols-2">
                {fields.map((field) => (
                  <div key={field.name} className={field.full ? "sm:col-span-2" : ""}>
                    {field.type !== "checkbox" && <label htmlFor={`f-${field.name}`} className="label">{field.label}{field.required ? " *" : ""}</label>}
                    {field.type === "textarea" ? (
                      <textarea id={`f-${field.name}`} rows={4} required={field.required} className="field" placeholder={field.placeholder} value={String(values[field.name] ?? "")} onChange={(e) => setValues({ ...values, [field.name]: e.target.value })} />
                    ) : field.type === "select" ? (
                      <select id={`f-${field.name}`} required={field.required} className="field" value={String(values[field.name] ?? "")} onChange={(e) => setValues({ ...values, [field.name]: e.target.value })}>
                        <option value="">— Select —</option>
                        {(field.options || []).map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                      </select>
                    ) : field.type === "checkbox" ? (
                      <label className="mt-1 flex cursor-pointer items-center gap-2 text-[11.5px] text-[#C2CCDD]">
                        <input type="checkbox" checked={Boolean(values[field.name])} onChange={(e) => setValues({ ...values, [field.name]: e.target.checked })} className="h-4 w-4 appearance-none rounded border border-white/20 bg-white/[0.03] checked:border-[#873BFF] checked:bg-[#873BFF]" />
                        {field.label}
                      </label>
                    ) : (
                      <input
                        id={`f-${field.name}`}
                        type={field.type === "money" || field.type === "number" ? "number" : field.type === "date" ? "date" : field.type === "email" ? "email" : "text"}
                        step={field.type === "money" ? "0.01" : undefined}
                        min={field.type === "number" || field.type === "money" ? 0 : undefined}
                        required={field.required}
                        className="field h-10 text-[12px]"
                        placeholder={field.placeholder}
                        value={String(values[field.name] ?? "")}
                        onChange={(e) => setValues({ ...values, [field.name]: e.target.value })}
                      />
                    )}
                    {field.help && <p className="mt-1 text-[9px] text-[#5F6B7E]">{field.help}</p>}
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-white/[0.07] px-5 py-3.5">
              <button type="button" onClick={() => setOpen(false)} className="btn btn-ghost btn-sm h-9">Cancel</button>
              <button type="submit" disabled={saving} className="btn btn-primary btn-sm h-9">
                {saving ? <Loader2 size={13} className="animate-spin" /> : editing ? "Save changes" : "Create"}
              </button>
            </div>
          </form>
        </div>
      )}

      {deleteTarget && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border border-white/[0.1] bg-[#0A0C15] p-5">
            <h3 className="text-[14px] font-semibold text-white">Delete this record?</h3>
            <p className="mt-1.5 text-[11px] leading-relaxed text-[#8492A6]">This action cannot be undone. Related content may also be removed.</p>
            {error && <p className="mt-3 rounded border border-rose-400/20 bg-rose-500/10 px-2 py-1.5 text-[10.5px] text-rose-200">{error}</p>}
            <div className="mt-5 flex gap-2">
              <button onClick={() => setDeleteTarget(null)} className="btn btn-ghost btn-sm h-9 flex-1">Cancel</button>
              <button onClick={confirmDelete} disabled={saving} className="btn btn-danger btn-sm h-9 flex-1">{saving ? <Loader2 size={13} className="animate-spin" /> : "Delete"}</button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function flattenRecord(record: Row): Row {
  const flat: Row = {};
  for (const [key, value] of Object.entries(record)) {
    if (value && typeof value === "object" && !Array.isArray(value) && !(value instanceof Date)) {
      for (const [nestedKey, nestedValue] of Object.entries(value as Row)) {
        flat[nestedKey] = nestedValue;
      }
    }
  }
  return flat;
}

function Cell({ value, kind }: { value: unknown; kind?: CrudColumn["kind"] }) {
  if (kind === "money") return <span className="num">{formatNaira(Number(value) || 0)}</span>;
  if (kind === "date") return <span className="text-[11px]">{value ? formatDate(String(value), true) : "—"}</span>;
  if (kind === "boolean") return <span className={Number(value) ? "text-emerald-300" : "text-[#5F6B7E]"}>{value ? "Yes" : "No"}</span>;
  if (kind === "badge") {
    const text = String(value ?? "—");
    const tone = text === "ACTIVE" || text === "PAID" || text === "PUBLISHED" || text === "VALID"
      ? "border-emerald-400/20 bg-emerald-500/10 text-emerald-300"
      : text === "PENDING" || text === "NEW"
        ? "border-amber-400/20 bg-amber-500/10 text-amber-300"
        : text === "SUSPENDED" || text === "REVOKED" || text === "FAILED"
          ? "border-rose-400/20 bg-rose-500/10 text-rose-300"
          : "border-white/10 bg-white/[0.03] text-[#9AA6BA]";
    return <span className={`inline-flex rounded-full border px-1.5 py-0.5 text-[8.5px] uppercase tracking-[0.06em] ${tone}`}>{text.replace(/_/g, " ")}</span>;
  }
  if (value === null || value === undefined || value === "") return <span className="text-[#3F4A5C]">—</span>;
  const text = String(value);
  return <span title={text}>{text.length > 60 ? `${text.slice(0, 60)}…` : text}</span>;
}
