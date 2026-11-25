import type { MetadataRoute } from "next";

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://uselafz.in";

/** The public pages. The app and sign-in are left out on purpose. */
export default function sitemap(): MetadataRoute.Sitemap {
  const updated = new Date("2026-11-25");
  return [
    { url: SITE, lastModified: updated, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE}/terms`, lastModified: updated, changeFrequency: "yearly", priority: 0.2 },
    { url: `${SITE}/privacy`, lastModified: updated, changeFrequency: "yearly", priority: 0.2 },
    { url: `${SITE}/refunds`, lastModified: updated, changeFrequency: "yearly", priority: 0.2 },
  ];
}
