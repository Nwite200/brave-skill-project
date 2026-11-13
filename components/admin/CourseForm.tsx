"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { AlertCircle, ArrowLeft, ImagePlus, Loader2, Save, Upload } from "lucide-react";

type Option = { value: string; label: string };

export type CourseFormValues = {
  id?: string;
  title: string;
  slug?: string;
  subtitle?: string | null;
  summary: string;
  description: string;
  outcomes?: string | null;
  requirements?: string | null;
  categoryId: string;
  instructorId?: string | null;
  level: "BEGINNER" | "INTERMEDIATE" | "ADVANCED";
  priceNaira: number;
  compareAtNaira: number;
  thumbnailUrl?: string | null;
  promoVideoUrl?: string | null;
  durationLabel?: string | null;
  certificateEnabled: boolean;
  examRequired: boolean;
  passMark: number;
  isPublished: boolean;
  isFeatured: boolean;
};

export function CourseForm({
  initial,
  categories,
  instructors,
  canPublish,
  children,
}: {
  initial?: CourseFormValues;
  categories: Option[];
  instructors: Option[];
  canPublish: boolean;
  children?: React.ReactNode;
}) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [form, setForm] = useState<CourseFormValues>(
    initial || {
      title: "",
      slug: "",
      subtitle: "",
      summary: "",
      description: "",
      outcomes: "",
      requirements: "",
      categoryId: categories[0]?.value || "",
      instructorId: instructors[0]?.value || "",
      level: "BEGINNER",
      priceNaira: 0,
      compareAtNaira: 0,
      thumbnailUrl: "",
      promoVideoUrl: "",
      durationLabel: "",
      certificateEnabled: true,
      examRequired: true,
      passMark: 60,
      isPublished: false,
      isFeatured: false,
    },
  );
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<"basics" | "content" | "settings">("basics");

  const update = <K extends keyof CourseFormValues>(key: K, value: CourseFormValues[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const uploadImage = async (file: File) => {
    setUploading(true);
    setError("");
    try {
      const body = new FormData();
      body.append("file", file);
      body.append("kind", "IMAGE");
      const res = await fetch("/api/admin/uploads", { method: "POST", body });
      const data = await res.json();
      if (!res.ok) setError(data.error || "Image upload failed.");
      else update("thumbnailUrl", data.asset.url);
    } catch {
      setError("Network error while uploading the image.");
    } finally {
      setUploading(false);
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const payload = {
        ...form,
        slug: form.slug || undefined,
        subtitle: form.subtitle || "",
        outcomes: form.outcomes || "",
        requirements: form.requirements || "",
        thumbnailUrl: form.thumbnailUrl || "",
        promoVideoUrl: form.promoVideoUrl || "",
        durationLabel: form.durationLabel || "",
        instructorId: form.instructorId || "",
        compareAtNaira: form.compareAtNaira || 0,
      };
      const res = await fetch(`/api/admin/courses${form.id ? `/${form.id}` : ""}`, {
        method: form.id ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Could not save the course.");
        setSaving(false);
        return;
      }
      if (form.id) {
        router.refresh();
        setSaving(false);
      } else {
        router.push(`/admin/courses/${data.course.id}`);
      }
    } catch {
      setError("Network error. Please try again.");
      setSaving(false);
    }
  };

  return (
    <>
    <form onSubmit={submit} className="mx-auto max-w-[1180px]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link href="/admin/courses" className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 text-[#9AA6BA] hover:text-white"><ArrowLeft size={14} /></Link>
          <div>
            <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-[#455063]">{form.id ? "Edit course" : "New course"}</p>
            <h1 className="text-[20px] font-semibold tracking-[-0.03em] text-white">{form.title || "Untitled course"}</h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {form.id && <Link href={`/courses/${form.slug}`} target="_blank" className="btn btn-ghost btn-sm h-8">Preview</Link>}
          <button type="submit" disabled={saving} className="btn btn-primary btn-sm h-8">
            {saving ? <Loader2 size={13} className="animate-spin" /> : <><Save size={12} /> Save course</>}
          </button>
        </div>
      </div>

      {error && <div className="mt-4 flex items-start gap-2 rounded-lg border border-rose-400/20 bg-rose-500/10 px-3 py-2.5 text-[11px] text-rose-200"><AlertCircle size={13} className="mt-0.5 shrink-0" /> {error}</div>}

      <div className="mt-5 flex gap-1 border-b border-white/[0.07]">
        {[
          { key: "basics", label: "Basics" },
          { key: "content", label: "Description" },
          { key: "settings", label: "Pricing & settings" },
        ].map((item) => (
          <button
            type="button"
            key={item.key}
            onClick={() => setTab(item.key as typeof tab)}
            className={`relative px-3 py-2 text-[11px] transition ${tab === item.key ? "text-white" : "text-[#6F7C90] hover:text-[#C2CCDD]"}`}
          >
            {item.label}
            {tab === item.key && <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-[#873BFF]" />}
          </button>
        ))}
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-[1.5fr_0.8fr]">
        <div className="space-y-4">
          {tab === "basics" && (
            <div className="rounded-xl border border-white/[0.07] bg-[#0A0C15] p-5">
              <div className="grid gap-4">
                <div>
                  <label htmlFor="title" className="label">Course title *</label>
                  <input id="title" required className="field" value={form.title} onChange={(e) => update("title", e.target.value)} placeholder="Solar Installation and Inverter Technology" />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="slug" className="label">URL slug</label>
                    <input id="slug" className="field" value={form.slug || ""} onChange={(e) => update("slug", e.target.value)} placeholder="auto-generated" />
                  </div>
                  <div>
                    <label htmlFor="category" className="label">Category *</label>
                    <select id="category" required className="field" value={form.categoryId} onChange={(e) => update("categoryId", e.target.value)}>
                      <option value="">Select a category</option>
                      {categories.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label htmlFor="subtitle" className="label">Subtitle</label>
                  <input id="subtitle" className="field" value={form.subtitle || ""} onChange={(e) => update("subtitle", e.target.value)} placeholder="Design, install and maintain modern solar power systems" />
                </div>
                <div>
                  <label htmlFor="summary" className="label">Short summary * <span className="text-[#5F6B7E]">(shown on cards)</span></label>
                  <textarea id="summary" required rows={3} className="field" value={form.summary} onChange={(e) => update("summary", e.target.value)} maxLength={400} />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="level" className="label">Level</label>
                    <select id="level" className="field" value={form.level} onChange={(e) => update("level", e.target.value as CourseFormValues["level"])}>
                      <option value="BEGINNER">Beginner</option>
                      <option value="INTERMEDIATE">Intermediate</option>
                      <option value="ADVANCED">Advanced</option>
                    </select>
                  </div>
                  <div>
                    <label htmlFor="duration" className="label">Duration label</label>
                    <input id="duration" className="field" value={form.durationLabel || ""} onChange={(e) => update("durationLabel", e.target.value)} placeholder="6 weeks · 8 hours" />
                  </div>
                </div>
                <div>
                  <label htmlFor="instructor" className="label">Instructor</label>
                  <select id="instructor" className="field" value={form.instructorId || ""} onChange={(e) => update("instructorId", e.target.value)}>
                    <option value="">Unassigned</option>
                    {instructors.map((i) => <option key={i.value} value={i.value}>{i.label}</option>)}
                  </select>
                </div>
              </div>
            </div>
          )}

          {tab === "content" && (
            <div className="rounded-xl border border-white/[0.07] bg-[#0A0C15] p-5">
              <div className="grid gap-4">
                <div>
                  <label htmlFor="description" className="label">Full description *</label>
                  <textarea id="description" required rows={9} className="field font-[inherit]" value={form.description} onChange={(e) => update("description", e.target.value)} placeholder="Write the course story, what students will build and who it is for. Separate paragraphs with a new line." />
                </div>
                <div>
                  <label htmlFor="outcomes" className="label">Learning outcomes <span className="text-[#5F6B7E]">(one per line)</span></label>
                  <textarea id="outcomes" rows={6} className="field" value={form.outcomes || ""} onChange={(e) => update("outcomes", e.target.value)} placeholder={"Size a solar array for a home\nWire batteries safely\nCommission an inverter"} />
                </div>
                <div>
                  <label htmlFor="requirements" className="label">Requirements <span className="text-[#5F6B7E]">(one per line)</span></label>
                  <textarea id="requirements" rows={4} className="field" value={form.requirements || ""} onChange={(e) => update("requirements", e.target.value)} placeholder={"No prior experience required\nA phone or laptop for lessons"} />
                </div>
              </div>
            </div>
          )}

          {tab === "settings" && (
            <div className="rounded-xl border border-white/[0.07] bg-[#0A0C15] p-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="price" className="label">Price (₦)</label>
                  <input id="price" type="number" min={0} step="0.01" className="field" value={form.priceNaira} onChange={(e) => update("priceNaira", Number(e.target.value))} />
                  <p className="mt-1 text-[9px] text-[#5F6B7E]">Set 0 for a free course.</p>
                </div>
                <div>
                  <label htmlFor="compare" className="label">Compare-at price (₦)</label>
                  <input id="compare" type="number" min={0} step="0.01" className="field" value={form.compareAtNaira} onChange={(e) => update("compareAtNaira", Number(e.target.value))} />
                </div>
                <div>
                  <label htmlFor="passMark" className="label">Exam pass mark (%)</label>
                  <input id="passMark" type="number" min={0} max={100} className="field" value={form.passMark} onChange={(e) => update("passMark", Number(e.target.value))} />
                </div>
                <div>
                  <label htmlFor="promo" className="label">Promo video URL</label>
                  <input id="promo" className="field" value={form.promoVideoUrl || ""} onChange={(e) => update("promoVideoUrl", e.target.value)} placeholder="https://…" />
                </div>
              </div>

              <div className="mt-5 space-y-3 border-t border-white/[0.06] pt-4">
                {[
                  { key: "certificateEnabled" as const, label: "Issue a certificate on completion", desc: "Requires all lessons complete and the exam passed (when enabled)." },
                  { key: "examRequired" as const, label: "Final assessment is required", desc: "When off, the certificate is issued once every lesson is complete." },
                  { key: "isPublished" as const, label: "Published on the website and Android app", desc: canPublish ? "Publishing makes the course immediately available." : "Instructors submit for administrator review." },
                  { key: "isFeatured" as const, label: "Feature on the homepage", desc: "Featured courses appear first in the featured section." },
                ].map((option) => (
                  <label key={option.key} className="flex cursor-pointer items-start gap-3">
                    <input
                      type="checkbox"
                      checked={Boolean(form[option.key])}
                      disabled={!canPublish && (option.key === "isPublished" || option.key === "isFeatured")}
                      onChange={(e) => update(option.key, e.target.checked)}
                      className="mt-0.5 h-4 w-4 shrink-0 appearance-none rounded border border-white/20 bg-white/[0.03] checked:border-[#873BFF] checked:bg-[#873BFF]"
                    />
                    <span>
                      <span className="block text-[11.5px] text-[#D6DFEC]">{option.label}</span>
                      <span className="block text-[9.5px] text-[#5F6B7E]">{option.desc}</span>
                    </span>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="rounded-xl border border-white/[0.07] bg-[#0A0C15] p-4">
            <p className="text-[9px] uppercase tracking-[0.16em] text-[#6F7C90]">Cover image</p>
            <div className="mt-3 overflow-hidden rounded-lg border border-white/10 bg-black/30">
              {form.thumbnailUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={form.thumbnailUrl} alt="Course cover" className="aspect-video w-full object-cover" />
              ) : (
                <div className="flex aspect-video flex-col items-center justify-center gap-1.5 text-[#3F4A5C]">
                  <ImagePlus size={20} />
                  <p className="text-[9px]">No cover uploaded</p>
                </div>
              )}
            </div>
            <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; if (file) uploadImage(file); }} />
            <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading} className="btn btn-ghost btn-sm mt-3 w-full h-8">
              {uploading ? <Loader2 size={12} className="animate-spin" /> : <><Upload size={11} /> Upload cover</>}
            </button>
            <p className="mt-2 text-[8.5px] leading-relaxed text-[#5F6B7E]">PNG, JPG or WebP, up to 8MB. Leave empty to use the branded generated cover.</p>
          </div>

          <div className="rounded-xl border border-white/[0.07] bg-[#0A0C15] p-4">
            <p className="text-[9px] uppercase tracking-[0.16em] text-[#6F7C90]">Status</p>
            <div className="mt-2 space-y-1.5 text-[10.5px]">
              <div className="flex justify-between"><span className="text-[#6F7C90]">Published</span><span className={form.isPublished ? "text-emerald-300" : "text-amber-300"}>{form.isPublished ? "Live" : "Draft"}</span></div>
              <div className="flex justify-between"><span className="text-[#6F7C90]">Price</span><span className="num text-white">{form.priceNaira === 0 ? "Free" : `₦${form.priceNaira.toLocaleString()}`}</span></div>
              <div className="flex justify-between"><span className="text-[#6F7C90]">Certificate</span><span className="text-[#C2CCDD]">{form.certificateEnabled ? "Yes" : "No"}</span></div>
            </div>
            {form.id && (
              <Link href={`/admin/examinations?course=${form.id}`} className="btn btn-ghost btn-sm mt-3 w-full h-8">Manage assessments</Link>
            )}
          </div>
        </div>
      </div>

    </form>
    {children}
    </>
  );
}
