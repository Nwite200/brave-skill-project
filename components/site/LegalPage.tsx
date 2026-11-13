import { PageHero } from "@/components/site/PageHero";

export function LegalPage({
  title,
  intro,
  updated,
  sections,
}: {
  title: string;
  intro: string;
  updated: string;
  sections: { heading: string; body: React.ReactNode }[];
}) {
  return (
    <>
      <PageHero
        eyebrow="Legal"
        title={title}
        subtitle={intro}
        breadcrumbs={[{ label: "Home", href: "/" }, { label: title }]}
      />
      <section className="py-14">
        <div className="container-bs grid gap-12 lg:grid-cols-[220px_1fr]">
          <aside className="lg:sticky lg:top-24 lg:h-fit">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#6F7C90]">Contents</p>
            <nav className="mt-3 space-y-1">
              {sections.map((section, index) => (
                <a
                  key={section.heading}
                  href={`#section-${index + 1}`}
                  className="block rounded-lg px-3 py-1.5 text-[11.5px] leading-snug text-[#8492A6] transition hover:bg-white/[0.03] hover:text-white"
                >
                  {index + 1}. {section.heading}
                </a>
              ))}
            </nav>
            <p className="mt-6 text-[10px] leading-relaxed text-[#5F6B7E]">Last updated {updated}</p>
          </aside>

          <div className="prose-bs max-w-[760px]">
            {sections.map((section, index) => (
              <div key={section.heading} id={`section-${index + 1}`} className="scroll-mt-28">
                <h2>
                  {index + 1}. {section.heading}
                </h2>
                {section.body}
              </div>
            ))}
            <div className="mt-12 rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5">
              <p className="!mb-1 text-[12px] font-medium text-white">Questions about this policy?</p>
              <p className="!mb-0 text-[11.5px]">
                Contact Emyphill-Tech Global Solutions Limited at{" "}
                <a href="mailto:support@academy.emyphilltech.com.ng" className="text-[#C9B8FF]">support@academy.emyphilltech.com.ng</a>.
              </p>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
