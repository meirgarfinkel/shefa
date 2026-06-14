import type { MetadataRoute } from "next";
import { getAppUrl } from "@/server/app-url";

export default function robots(): MetadataRoute.Robots {
  const base = getAppUrl();
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Auth-gated trees (they 302 to /sign-in for crawlers — nothing to index) and the
      // API. `/seeker` is fully disallowed: seeker profiles are intentionally kept private.
      disallow: [
        "/admin",
        "/employer",
        "/messages",
        "/seeker",
        "/role-select",
        "/sign-in",
        "/api/",
      ],
    },
    sitemap: `${base}/sitemap.xml`,
  };
}
