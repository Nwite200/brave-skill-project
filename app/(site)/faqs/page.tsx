import type { Metadata } from "next";
import Link from "next/link";
import { HelpCircle, MessageCircle } from "lucide-react";
import { db } from "@/lib/db";
import { PageHero } from "@/components/site/PageHero";
import { Accordion } from "@/components/ui/Accordion";
import { getSettings } from "@/lib/settings";

export const metadata: Metadata = {
  title: "Frequently asked questions",
  description: "Answers about Brave Skill courses, payments, certificates, the Android app and refunds.",
};

export const dynamic = "force-dynamic";

export default async function FaqsPage() {
  const [faqs, settings] = await Promise.all([
    db.faq.findMany({ where: { isPublished: true }, orderBy: [{ category: "asc" }, { position: "asc" }] }),
    getSettings(),
  ]);

  const grouped = faqs.reduce<Record<string, typeof faqs>>((acc, faq) => {
    const key = faq.category || "General";
    acc[key] = acc[key] || [];
    acc[key].push(faq);
    return acc;
  }, {});

  return (
    <>
      <PageHero
        eyebrow="Help centre"
        title={<>Questions, <span className="text-gradient-cyan">answered.</span></>}
        subtitle="Everything about enrolment, payments, practical training, certificates and the Android app."
        breadcrumbs={[{ label: "Home", href: "/" }, { label: "FAQs" }]}
      />

      <section className="py-14">
        <div className="container-bs grid gap-10 lg:grid-cols-[220px_1fr]">
          <aside className="lg:sticky lg:top-24 lg:h-fit">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#6F7C90]">On this page</p>
            <nav className="mt-3 space-y-1">
              {Object.keys(grouped).map((category) => (
                <a key={category} href={`#${category.toLowerCase().replace(/\s+/g, "-")}`} className="block rounded-lg px-3 py-2 text-[12px] text-[#8492A6] transition hover:bg-white/[0.03] hover:text-white">
                  {category}
                </a>
              ))}
            </nav>
            <div className="mt-6 rounded-xl border border-white/[0.07] bg-white/[0.02] p-4">
              <MessageCircle size={16} className="text-[#20D9E8]" />
              <p className="mt-2 text-[11.5px] font-medium text-white">Still stuck?</p>
              <p className="mt-1 text-[10.5px] leading-relaxed text-[#7C8AA3]">Message the support team and we will help directly.</p>
              <Link href="/contact" className="btn btn-ghost btn-sm mt-3 w-full">Contact support</Link>
            </div>
          </aside>

          <div className="min-w-0 space-y-10">
            {Object.entries(grouped).map(([category, items]) => (
              <div key={category} id={category.toLowerCase().replace(/\s+/g, "-")} className="scroll-mt-28">
                <div className="mb-4 flex items-center gap-2.5">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#873BFF]/12 text-[#C9B8FF]"><HelpCircle size={13} /></span>
                  <h2 className="text-[16px] font-semibold text-white">{category}</h2>
                  <span className="text-[10px] text-[#5F6B7E]">{items.length}</span>
                </div>
                <Accordion items={items.map((f) => ({ question: f.question, answer: f.answer }))} defaultOpen={-1} />
              </div>
            ))}
            {!faqs.length && <p className="text-[13px] text-[#8492A6]">FAQs are being prepared.</p>}

            <div className="rounded-2xl border border-[#873BFF]/20 bg-[#873BFF]/[0.06] p-6">
              <p className="text-[14px] font-medium text-white">Prefer to talk?</p>
              <p className="mt-1 text-[11.5px] leading-relaxed text-[#93A1B6]">
                Call {settings["site.phone"]} or send a WhatsApp message. Support hours are Monday–Friday, 9:00–17:00 WAT.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Link href="/contact" className="btn btn-primary btn-sm h-10">Send a message</Link>
                {settings["site.whatsapp"] && (
                  <a href={`https://wa.me/${settings["site.whatsapp"]}`} target="_blank" rel="noreferrer" className="btn btn-ghost btn-sm h-10">WhatsApp us</a>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
