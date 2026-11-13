import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const base = process.env.NEXT_PUBLIC_SITE_URL || "https://academy.emyphilltech.com.ng";
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: ["/admin", "/dashboard", "/api", "/checkout"] },
    ],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
