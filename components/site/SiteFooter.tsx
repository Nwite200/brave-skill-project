import Link from "next/link";
import { ArrowUpRight, Facebook, Instagram, Linkedin, Mail, MapPin, Phone, Youtube } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { getSettings } from "@/lib/settings";

const columns = [
  {
    title: "Learn",
    links: [
      { href: "/courses", label: "All courses" },
      { href: "/courses?category=solar", label: "Solar & inverter" },
      { href: "/courses?category=security", label: "CCTV & security" },
      { href: "/courses?category=networking", label: "Networking" },
      { href: "/verify", label: "Verify a certificate" },
    ],
  },
  {
    title: "Company",
    links: [
      { href: "/about", label: "About Brave Skill" },
      { href: "/testimonials", label: "Student stories" },
      { href: "/contact", label: "Contact us" },
      { href: "/faqs", label: "FAQs" },
      { href: "/download", label: "Android app" },
      { href: "/intro", label: "Brand film" },
    ],
  },
  {
    title: "Legal",
    links: [
      { href: "/privacy", label: "Privacy policy" },
      { href: "/terms", label: "Terms & conditions" },
      { href: "/refunds", label: "Refund policy" },
      { href: "/verify", label: "Certificate verification" },
      { href: "/admin", label: "Administrator" },
    ],
  },
];

export async function SiteFooter() {
  const settings = await getSettings();
  const socials = [
    { href: settings["site.instagram"], icon: Instagram, label: "Instagram" },
    { href: settings["site.facebook"], icon: Facebook, label: "Facebook" },
    { href: settings["site.youtube"], icon: Youtube, label: "YouTube" },
    { href: settings["site.linkedin"], icon: Linkedin, label: "LinkedIn" },
  ].filter((s) => s.href);

  return (
    <footer className="relative overflow-hidden border-t border-white/[0.07] bg-[#07080F]">
      <div className="pointer-events-none absolute -left-40 top-0 h-[380px] w-[380px] rounded-full bg-[#873BFF]/10 blur-[110px]" />
      <div className="pointer-events-none absolute -right-32 bottom-0 h-[300px] w-[300px] rounded-full bg-[#20D9E8]/[0.06] blur-[110px]" />

      <div className="container-bs relative py-16">
        <div className="grid gap-12 lg:grid-cols-[1.5fr_2fr]">
          <div>
            <Logo variant="full" size={44} showTagline />
            <p className="mt-6 max-w-sm text-[13.5px] leading-relaxed text-[#8D9BB0]">
              A premium skill acquisition academy for ambitious Africans. Practical, hands-on technical training that
              turns knowledge into income — built by Emyphill-Tech Global Solutions Limited.
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              {socials.map(({ href, icon: Icon, label }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noreferrer noopener"
                  aria-label={label}
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 text-[#9AA6BA] transition hover:border-[#873BFF]/50 hover:text-white"
                >
                  <Icon size={15} />
                </a>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-8 sm:grid-cols-3">
            {columns.map((col) => (
              <div key={col.title}>
                <h4 className="mb-4 text-[10px] font-semibold uppercase tracking-[0.22em] text-[#6E7C92]">{col.title}</h4>
                <ul className="space-y-2.5">
                  {col.links.map((link) => (
                    <li key={link.href}>
                      <Link href={link.href} className="text-[13px] text-[#A2AFC2] transition hover:text-white">
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-14 grid gap-4 border-t border-white/[0.07] pt-8 sm:grid-cols-3">
          <a href={`mailto:${settings["site.email"]}`} className="flex items-center gap-2.5 text-[12.5px] text-[#9AA6BA] hover:text-white">
            <Mail size={14} className="text-[#873BFF]" /> {settings["site.email"]}
          </a>
          <a href={`tel:${settings["site.phone"]}`} className="flex items-center gap-2.5 text-[12.5px] text-[#9AA6BA] hover:text-white">
            <Phone size={14} className="text-[#20D9E8]" /> {settings["site.phone"]}
          </a>
          <span className="flex items-center gap-2.5 text-[12.5px] text-[#9AA6BA]">
            <MapPin size={14} className="text-[#10C99A]" /> {settings["site.address"]}
          </span>
        </div>

        <div className="mt-10 flex flex-col items-start justify-between gap-4 border-t border-white/[0.07] pt-6 sm:flex-row sm:items-center">
          <p className="text-[11.5px] text-[#6E7C92]">
            © {new Date().getFullYear()} Emyphill-Tech Global Solutions Limited. All rights reserved.
          </p>
          <div className="flex items-center gap-5 text-[11.5px] text-[#6E7C92]">
            <Link href="/download" className="inline-flex items-center gap-1 transition hover:text-white">
              Get the Android app <ArrowUpRight size={12} />
            </Link>
            <span className="hidden sm:inline">RC — Nigeria</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
