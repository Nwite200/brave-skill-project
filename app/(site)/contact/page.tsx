import type { Metadata } from "next";
import Link from "next/link";
import { Clock3, Mail, MapPin, MessageCircle, Phone, ShieldCheck } from "lucide-react";
import { PageHero } from "@/components/site/PageHero";
import { ContactForm } from "@/components/site/ContactForm";
import { getSettings } from "@/lib/settings";

export const metadata: Metadata = {
  title: "Contact",
  description: "Talk to Brave Skill admissions and support about courses, payments, certificates or corporate training.",
};

export default async function ContactPage() {
  const settings = await getSettings();
  const whatsapp = settings["site.whatsapp"];

  return (
    <>
      <PageHero
        eyebrow="Contact"
        title={<>Talk to a <span className="text-gradient">real person.</span></>}
        subtitle="Questions about a course, a payment or your certificate? Our admissions and support team is here to help."
        breadcrumbs={[{ label: "Home", href: "/" }, { label: "Contact" }]}
      />

      <section className="py-12">
        <div className="container-bs grid gap-8 lg:grid-cols-[0.8fr_1.2fr]">
          <div>
            <div className="space-y-3">
              {[
                { icon: Mail, label: "Email", value: settings["site.email"], href: `mailto:${settings["site.email"]}` },
                { icon: Phone, label: "Phone", value: settings["site.phone"], href: `tel:${settings["site.phone"]}` },
                { icon: MessageCircle, label: "WhatsApp", value: "Chat with admissions", href: `https://wa.me/${whatsapp}` },
                { icon: MapPin, label: "Location", value: settings["site.address"] },
                { icon: Clock3, label: "Support hours", value: "Mon – Fri, 9:00 – 17:00 WAT" },
              ].map((item) => (
                <div key={item.label} className="flex items-start gap-3 rounded-xl border border-white/[0.07] bg-white/[0.02] p-4">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#873BFF]/12 text-[#C9B8FF]"><item.icon size={15} /></span>
                  <div className="min-w-0">
                    <p className="text-[9px] uppercase tracking-[0.16em] text-[#6F7C90]">{item.label}</p>
                    {item.href ? (
                      <a href={item.href} target={item.href.startsWith("http") ? "_blank" : undefined} rel="noreferrer" className="break-words text-[12.5px] text-white hover:text-[#C9B8FF]">{item.value}</a>
                    ) : (
                      <p className="text-[12.5px] text-white">{item.value}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-5 rounded-2xl border border-[#10C99A]/20 bg-[#10C99A]/[0.05] p-5">
              <div className="flex items-center gap-2 text-[12px] font-medium text-[#7FE9C8]"><ShieldCheck size={15} /> Corporate & group training</div>
              <p className="mt-1.5 text-[11px] leading-relaxed text-[#93A1B6]">
                Training a team or equipping a workshop? We design private cohorts and on-site programmes. Mention “corporate” in your message.
              </p>
              <Link href="/about" className="mt-3 inline-flex text-[11px] text-[#C9B8FF] hover:text-white">Learn about Brave Skill →</Link>
            </div>
          </div>

          <ContactForm />
        </div>
      </section>
    </>
  );
}
