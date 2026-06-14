import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: "https://shefa.meirgarfinkel.com",
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1,
    },

    {
      url: "https://shefa.meirgarfinkel.com/jobs",
      lastModified: new Date(),
      changeFrequency: "hourly",
      priority: 0.9,
    },
  ];
}
