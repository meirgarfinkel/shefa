import type { MetadataRoute } from "next";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { jobPosting } from "@/db/schema";
import { getAppUrl } from "@/server/app-url";

// Regenerate hourly (ISR) rather than per-request or at build time, so the sitemap tracks
// new/closed jobs without hammering Neon.
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = getAppUrl();

  const jobs = await db.query.jobPosting.findMany({
    where: eq(jobPosting.status, "ACTIVE"),
    columns: { id: true, updatedAt: true },
    with: {
      business: {
        columns: { id: true },
        with: {
          owner: {
            columns: { id: true },
            with: { employerProfile: { columns: { status: true } } },
          },
        },
      },
    },
  });

  // Mirror getById visibility: hide jobs whose employer is suspended.
  const visible = jobs.filter((j) => j.business.owner.employerProfile?.status !== "SUSPENDED");

  const jobEntries: MetadataRoute.Sitemap = visible.map((j) => ({
    url: `${base}/jobs/${j.id}`,
    lastModified: j.updatedAt,
    changeFrequency: "daily",
    priority: 0.8,
  }));

  const businessEntries: MetadataRoute.Sitemap = [
    ...new Set(visible.map((j) => j.business.id)),
  ].map((id) => ({
    url: `${base}/business/${id}`,
    changeFrequency: "weekly",
    priority: 0.5,
  }));

  return [
    { url: base, lastModified: new Date(), changeFrequency: "daily", priority: 1 },
    { url: `${base}/jobs`, lastModified: new Date(), changeFrequency: "hourly", priority: 0.9 },
    { url: `${base}/privacy`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${base}/terms`, changeFrequency: "yearly", priority: 0.2 },
    ...jobEntries,
    ...businessEntries,
  ];
}
