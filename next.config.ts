import type { NextConfig } from "next";

// One public address: in production, pages on any other host (www, Railway's own domain)
// redirect to NEXT_PUBLIC_SITE_URL. API routes are left alone, so webhooks keep working.
const site = process.env.NEXT_PUBLIC_SITE_URL;
const siteHost = site ? new URL(site).hostname : null;

const nextConfig: NextConfig = {
  async redirects() {
    if (!site || !siteHost || process.env.NODE_ENV !== "production" || siteHost === "localhost") return [];
    return [
      {
        source: "/:path((?!api/).*)",
        missing: [{ type: "host", value: siteHost }],
        destination: `${site.replace(/\/$/, "")}/:path`,
        permanent: true,
      },
    ];
  },
  // Basic hardening: no framing (clickjacking on checkout and sign-in), no MIME sniffing,
  // no full URLs leaked to other sites.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Content-Security-Policy", value: "frame-ancestors 'none'; base-uri 'self'; object-src 'none'" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          // HTTPS only, for two years; set in production so localhost isn't affected.
          ...(process.env.NODE_ENV === "production" ? [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" }] : []),
        ],
      },
    ];
  },
  // Don't advertise the framework.
  poweredByHeader: false,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
