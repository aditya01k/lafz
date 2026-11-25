import type { MetadataRoute } from "next";

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://uselafz.in";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/app", "/api/", "/login"] },
    sitemap: `${SITE}/sitemap.xml`,
    host: SITE,
  };
}
