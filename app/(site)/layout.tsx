import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { getSessionUser } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { VoiceAgent } from "@/components/agent/VoiceAgent";

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const [user, settings] = await Promise.all([getSessionUser(), getSettings()]);
  const banner = settings["announcement.bar"];

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader
        user={user}
        announcement={banner ? { text: banner, link: settings["announcement.link"] || undefined } : null}
      />
      <main id="main" className="flex-1">
        {children}
      </main>
      <SiteFooter />
      <VoiceAgent />
    </div>
  );
}
