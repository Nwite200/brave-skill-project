import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BadgeCheck, Quote, Star } from "lucide-react";
import { db } from "@/lib/db";
import { PageHero } from "@/components/site/PageHero";

export const metadata: Metadata = {
  title: "Student success stories",
  description: "Real Brave Skill students building income with solar, CCTV, electrical, networking and access control skills.",
};

export const dynamic = "force-dynamic";

export default async function TestimonialsPage() {
  const testimonials = await db.testimonial.findMany({
    where: { isPublished: true },
    orderBy: { position: "asc" },
  });

  return (
    <>
      <PageHero
        eyebrow="Success stories"
        title={<>Skills that changed <span className="text-gradient">the trajectory.</span></>}
        subtitle="Our students are installing systems, serving clients and building businesses across Nigeria. Here is what they say."
        breadcrumbs={[{ label: "Home", href: "/" }, { label: "Success stories" }]}
      />

      <section className="py-14">
        <div className="container-bs">
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              { value: "4.9/5", label: "Average rating", icon: Star },
              { value: "1,300+", label: "Student reviews", icon: Quote },
              { value: "3,200+", label: "Certificates issued", icon: BadgeCheck },
            ].map((item) => (
              <div key={item.label} className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5">
                <item.icon size={16} className="text-[#873BFF]" />
                <p className="num mt-3 text-[26px] font-semibold text-white">{item.value}</p>
                <p className="text-[9.5px] uppercase tracking-[0.16em] text-[#6F7C90]">{item.label}</p>
              </div>
            ))}
          </div>

          <div className="mt-8 columns-1 gap-4 sm:columns-2 lg:columns-3">
            {testimonials.map((testimonial) => (
              <figure key={testimonial.id} className="mb-4 break-inside-avoid rounded-2xl border border-white/[0.08] bg-gradient-to-b from-white/[0.035] to-transparent p-6">
                <div className="flex items-center justify-between">
                  <Quote size={17} className="text-[#873BFF]" />
                  <div className="flex gap-0.5">
                    {Array.from({ length: testimonial.rating }).map((_, i) => <Star key={i} size={10} className="fill-[#FBBF24] text-[#FBBF24]" />)}
                  </div>
                </div>
                <blockquote className="mt-4 text-[13px] leading-[1.85] text-[#C3CEDF]">“{testimonial.quote}”</blockquote>
                <figcaption className="mt-5 flex items-center gap-3 border-t border-white/[0.07] pt-4">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-[#873BFF] to-[#1677FF] text-[11px] font-semibold">
                    {testimonial.name.split(" ").map((p) => p[0]).slice(0, 2).join("")}
                  </span>
                  <div>
                    <p className="text-[12px] font-medium text-white">{testimonial.name}</p>
                    <p className="text-[10px] text-[#7C8AA3]">{testimonial.role || testimonial.courseTitle}</p>
                  </div>
                </figcaption>
              </figure>
            ))}
          </div>

          {!testimonials.length && (
            <p className="py-16 text-center text-[13px] text-[#8492A6]">Student stories are being published.</p>
          )}

          <div className="mt-12 flex flex-col items-center justify-between gap-4 rounded-2xl border border-white/[0.08] bg-[#0B0E18] p-6 sm:flex-row">
            <div>
              <p className="text-[14px] font-medium text-white">Your story could be next.</p>
              <p className="mt-1 text-[11.5px] text-[#93A1B6]">Start with a track that matches your market and your ambition.</p>
            </div>
            <Link href="/courses" className="btn btn-primary btn-sm h-10">Explore courses <ArrowRight size={13} /></Link>
          </div>
        </div>
      </section>
    </>
  );
}
