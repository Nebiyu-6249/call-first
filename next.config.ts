import type { NextConfig } from "next";

// Basic hardening for every page. A full script Content-Security-Policy is left out because the
// prerendered pages use Next.js inline scripts, which would need per-request nonces.
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Never tell other sites which page someone came from (pairing links carry a code).
  { key: "Referrer-Policy", value: "no-referrer" },
  // No other site may show these pages in a frame (protects against click-jacking).
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'" },
  // Microphone for "Tell me what happened"; nothing else.
  { key: "Permissions-Policy", value: "microphone=(self), camera=(self), geolocation=(), payment=(), usb=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
];

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      // The service worker must always be checked for a new version.
      { source: "/sw.js", headers: [{ key: "Cache-Control", value: "no-cache" }] },
    ];
  },
};

export default nextConfig;
