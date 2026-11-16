import type { NextConfig } from "next";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1:54321";
const supabaseHost = new URL(supabaseUrl);

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin-allow-popups" },
  // A conservative policy that does not break Next.js inline bootstrapping: no plugins, no framing,
  // no foreign <base>, and forms only post to ourselves.
  {
    key: "Content-Security-Policy",
    value: "object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self' https://accounts.google.com",
  },
];

const nextConfig: NextConfig = {
  // Nearly every page here depends on the signed-in member, so the classic dynamic model is used
  // instead of Cache Components; public pages are still statically rendered where possible.
  cacheComponents: false,
  poweredByHeader: false,
  experimental: {
    useOffline: true,
  },
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      {
        protocol: supabaseHost.protocol.replace(":", "") as "http" | "https",
        hostname: supabaseHost.hostname,
        port: supabaseHost.port,
        pathname: "/storage/v1/object/public/**",
      },
    ],
    // Local Supabase runs on 127.0.0.1 in development.
    dangerouslyAllowLocalIP: process.env.NODE_ENV !== "production",
  },
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      {
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Service-Worker-Allowed", value: "/" },
        ],
      },
    ];
  },
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
