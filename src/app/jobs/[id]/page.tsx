import { cache } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createServerCaller } from "@/server/api/server";
import { getAppUrl } from "@/server/app-url";
import { buildJobPostingJsonLd, jobPostingUrl } from "@/lib/seo/job-posting";
import { JobDetailClient } from "./_client";

/**
 * Fetch the public job once per request (deduped across generateMetadata + the page).
 * Reuses `jobPosting.getById`, so visibility rules (ACTIVE-only, suspended-employer
 * hiding, owner preview) are identical to the client query. Returns null when not visible.
 */
const getJob = cache(async (id: string) => {
  try {
    const caller = await createServerCaller();
    return await caller.jobPosting.getById({ id });
  } catch {
    return null;
  }
});

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const job = await getJob(id);
  if (!job) return { title: "Job not found | Shefa", robots: { index: false } };

  const title = `${job.title} at ${job.business.name} | Shefa`;
  const description =
    `${job.title} — ${job.business.name}, ${job.city}, ${job.state}. From $${Number(
      job.minHourlyRate,
    ).toFixed(2)}/hr. ${job.description}`
      .replace(/\s+/g, " ")
      .slice(0, 160);
  const url = jobPostingUrl(getAppUrl(), id);

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { title, description, url, type: "website" },
  };
}

export default async function JobDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const job = await getJob(id);
  if (!job) notFound();

  const jsonLd = buildJobPostingJsonLd(job, getAppUrl());

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <JobDetailClient id={id} initialJob={job} />
    </>
  );
}
