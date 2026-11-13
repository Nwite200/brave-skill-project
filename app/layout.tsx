import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { LogoIntro } from "@/components/brand/LogoIntro";
import { getSettings } from "@/lib/settings";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://academy.emyphilltech.com.ng"),
  title: {
    default: "Brave Skill — Skill Acquisition Academy",
    template: "%s | Brave Skill",
  },
  description:
    "Brave Skill is a premium skill acquisition academy: solar installation, CCTV, electrical, networking and access control. Learn practical skills. Build your future.",
  keywords: [
    "Brave Skill",
    "skill acquisition",
    "solar installation course",
    "CCTV installation training",
    "electrical installation",
    "fiber optics",
    "access control",
    "Nigeria",
  ],
  authors: [{ name: "Emyphill-Tech Global Solutions Limited" }],
  openGraph: {
    type: "website",
    siteName: "Brave Skill",
    title: "Brave Skill — Skill Acquisition Academy",
    description: "Learn practical skills. Build your future. Hands-on technical training with certification.",
    images: ["/brand/og-image.png"],
  },
  twitter: {
    card: "summary_large_image",
    title: "Brave Skill — Skill Acquisition Academy",
    description: "Learn practical skills. Build your future.",
    images: ["/brand/og-image.png"],
  },
  icons: {
    icon: [{ url: "/brand/favicon.svg", type: "image/svg+xml" }],
    apple: [{ url: "/brand/apple-touch-icon.png" }],
  },
  manifest: "/manifest.webmanifest",
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#050509",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const settings = await getSettings();
  const orgJsonLd = {
    "@context": "https://schema.org",
    "@type": "EducationalOrganization",
    name: "Brave Skill",
    alternateName: "Brave Skill Skill Acquisition Academy",
    url: process.env.NEXT_PUBLIC_SITE_URL || "https://academy.emyphilltech.com.ng",
    description: settings["hero.subtitle"],
    parentOrganization: { "@type": "Organization", name: "Emyphill-Tech Global Solutions Limited" },
    email: settings["site.email"],
    telephone: settings["site.phone"],
    sameAs: [settings["site.instagram"], settings["site.facebook"], settings["site.youtube"]].filter(Boolean),
  };

  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <body className="min-h-screen bg-ink text-white antialiased">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[300] focus:rounded-full focus:bg-white focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-black"
        >
          Skip to content
        </a>
        <LogoIntro />
        {children}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(orgJsonLd) }}
        />
      </body>
    </html>
  );
}
