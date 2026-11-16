import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/env";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/settings", "/messages", "/notifications", "/mod", "/admin", "/home", "/initiation", "/auth/", "/u/"],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
