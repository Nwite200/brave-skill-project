import type { Metadata } from "next";
import { requireAdminPage } from "@/lib/auth";
import { db } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { CrudPanel } from "@/components/admin/CrudPanel";
import { SettingsForm } from "@/components/admin/SettingsForm";
import { ApkManager } from "@/components/admin/ApkManager";
import { MessageList } from "@/components/admin/MessageList";

export const metadata: Metadata = { title: "Website management · Admin" };
export const dynamic = "force-dynamic";

export default async function AdminWebsitePage() {
  await requireAdminPage();
  const [settings, testimonials, faqs, releases, messages, courses] = await Promise.all([
    getSettings(),
    db.testimonial.findMany({ orderBy: { position: "asc" } }),
    db.faq.findMany({ orderBy: [{ category: "asc" }, { position: "asc" }] }),
    db.apkRelease.findMany({ orderBy: { versionCode: "desc" } }),
    db.contactMessage.findMany({ orderBy: { createdAt: "desc" }, take: 50 }),
    db.course.findMany({ orderBy: { title: "asc" }, select: { title: true } }),
  ]);

  return (
    <div className="mx-auto max-w-[1180px] space-y-8">
      <div>
        <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-[#455063]">Platform / website</p>
        <h1 className="mt-1.5 text-[22px] font-semibold tracking-[-0.03em] text-white">Website management</h1>
        <p className="mt-1 text-[11.5px] text-[#8492A6]">Edit the public website content, social proof, app distribution and the contact inbox.</p>
      </div>

      <section>
        <h2 className="mb-3 text-[13px] font-semibold text-white">Homepage & identity</h2>
        <SettingsForm
          settings={settings}
          groups={[
            {
              title: "Hero",
              fields: [
                { key: "hero.eyebrow", label: "Eyebrow text", full: true },
                { key: "hero.title", label: "Headline", full: true, help: "Use two sentences separated by a full stop for the two-line treatment." },
                { key: "hero.subtitle", label: "Sub-headline", type: "textarea", full: true },
              ],
            },
            {
              title: "Statistics",
              fields: [
                { key: "stats.students", label: "Students trained" },
                { key: "stats.courses", label: "Courses" },
                { key: "stats.certificates", label: "Certificates issued" },
                { key: "stats.instructors", label: "Instructors" },
              ],
            },
            {
              title: "Contact",
              fields: [
                { key: "site.email", label: "Support email" },
                { key: "site.phone", label: "Phone" },
                { key: "site.whatsapp", label: "WhatsApp number", help: "Digits only, including country code." },
                { key: "site.address", label: "Location" },
              ],
            },
            {
              title: "Social",
              fields: [
                { key: "site.instagram", label: "Instagram URL" },
                { key: "site.facebook", label: "Facebook URL" },
                { key: "site.youtube", label: "YouTube URL" },
                { key: "site.tiktok", label: "TikTok URL" },
                { key: "site.linkedin", label: "LinkedIn URL" },
              ],
            },
            {
              title: "Announcement",
              fields: [
                { key: "announcement.bar", label: "Top bar message", full: true, help: "Leave blank to hide the top announcement bar." },
                { key: "announcement.link", label: "Top bar link", full: true },
              ],
            },
          ]}
        />
      </section>

      <section>
        <h2 className="mb-3 text-[13px] font-semibold text-white">Android app</h2>
        <div className="space-y-4">
          <SettingsForm
            settings={settings}
            groups={[
              {
                title: "App details",
                fields: [
                  { key: "app.version", label: "Public version label" },
                  { key: "app.requires", label: "Android requirement" },
                  { key: "app.size", label: "Fallback size label" },
                  { key: "app.notes", label: "Release notes", type: "textarea", full: true },
                ],
              },
            ]}
          />
          <ApkManager
            releases={releases.map((r) => ({
              id: r.id,
              version: r.version,
              versionCode: r.versionCode,
              notes: r.notes,
              sizeBytes: r.sizeBytes,
              minAndroid: r.minAndroid,
              isActive: r.isActive,
              downloads: r.downloads,
              releasedAt: r.releasedAt.toISOString(),
              assetId: r.assetId,
            }))}
          />
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-[13px] font-semibold text-white">Student testimonials</h2>
        <CrudPanel
          resource="testimonials"
          title="Testimonials"
          description="Shown on the homepage and success stories page."
          createLabel="New testimonial"
          fields={[
            { name: "name", label: "Student name", type: "text", required: true },
            { name: "role", label: "Role / title", type: "text" },
            { name: "courseTitle", label: "Course completed", type: "text" },
            { name: "rating", label: "Rating (1–5)", type: "number", defaultValue: 5 },
            { name: "quote", label: "Quote", type: "textarea", required: true, full: true },
            { name: "position", label: "Order", type: "number", defaultValue: 0 },
            { name: "isPublished", label: "Published", type: "checkbox", defaultValue: true },
          ]}
          columns={[
            { key: "name", label: "Student" },
            { key: "role", label: "Role" },
            { key: "quote", label: "Quote" },
            { key: "rating", label: "Stars", kind: "number" },
            { key: "isPublished", label: "Live", kind: "boolean" },
          ]}
          rows={testimonials}
        />
      </section>

      <section>
        <h2 className="mb-3 text-[13px] font-semibold text-white">FAQs</h2>
        <CrudPanel
          resource="faqs"
          title="Frequently asked questions"
          description="Grouped by category on the public FAQ page."
          createLabel="New FAQ"
          fields={[
            { name: "question", label: "Question", type: "text", required: true, full: true },
            { name: "answer", label: "Answer", type: "textarea", required: true, full: true },
            { name: "category", label: "Category", type: "text", defaultValue: "General" },
            { name: "position", label: "Order", type: "number", defaultValue: 0 },
            { name: "isPublished", label: "Published", type: "checkbox", defaultValue: true },
          ]}
          columns={[
            { key: "question", label: "Question" },
            { key: "category", label: "Category" },
            { key: "position", label: "Order", kind: "number" },
            { key: "isPublished", label: "Live", kind: "boolean" },
          ]}
          rows={faqs}
        />
      </section>

      <section id="messages" className="scroll-mt-24">
        <h2 className="mb-3 text-[13px] font-semibold text-white">Contact inbox</h2>
        <MessageList
          messages={messages.map((m) => ({
            id: m.id,
            name: m.name,
            email: m.email,
            phone: m.phone,
            subject: m.subject,
            message: m.message,
            status: m.status,
            createdAt: m.createdAt.toISOString(),
          }))}
        />
        <p className="mt-2 text-[9px] text-[#5F6B7E]">{courses.length} courses currently in the catalogue.</p>
      </section>
    </div>
  );
}
