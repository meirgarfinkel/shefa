import type { JobType, WorkArrangement } from "@/db/schema";

/**
 * Google Jobs eligibility requires server-rendered `JobPosting` structured data on each
 * public job page. This builds that JSON-LD from the same shape `jobPosting.getById`
 * returns (kept as a narrow structural input so it's trivially unit-testable).
 *
 * Docs: https://developers.google.com/search/docs/appearance/structured-data/job-posting
 */
export interface JobPostingSeoInput {
  id: string;
  title: string;
  description: string;
  jobType: JobType;
  workArrangement: WorkArrangement;
  city: string;
  state: string;
  minHourlyRate: string;
  createdAt: Date;
  lastVerifiedAt: Date;
  business: { name: string };
}

/**
 * Google expects job postings to expire. We mirror the freshness auto-pause horizon
 * (28 days after last verification — see `src/server/jobs/freshness.job.ts`) so a stale
 * listing drops out of Google Jobs at the same time it auto-pauses on the site.
 */
const VALID_THROUGH_DAYS = 28;
const DAY_MS = 24 * 60 * 60 * 1000;

export function jobValidThrough(lastVerifiedAt: Date): Date {
  return new Date(lastVerifiedAt.getTime() + VALID_THROUGH_DAYS * DAY_MS);
}

/** Map our `JobType` to schema.org `employmentType` (Google accepts an array). */
function employmentType(jobType: JobType): string | string[] {
  switch (jobType) {
    case "FULL_TIME":
      return "FULL_TIME";
    case "PART_TIME":
      return "PART_TIME";
    case "EITHER":
      return ["FULL_TIME", "PART_TIME"];
  }
}

export function jobPostingUrl(baseUrl: string, id: string): string {
  return `${baseUrl}/jobs/${id}`;
}

export function buildJobPostingJsonLd(job: JobPostingSeoInput, baseUrl: string) {
  return {
    "@context": "https://schema.org/",
    "@type": "JobPosting",
    title: job.title,
    description: job.description,
    datePosted: job.createdAt.toISOString(),
    validThrough: jobValidThrough(job.lastVerifiedAt).toISOString(),
    employmentType: employmentType(job.jobType),
    url: jobPostingUrl(baseUrl, job.id),
    identifier: {
      "@type": "PropertyValue",
      name: job.business.name,
      value: job.id,
    },
    hiringOrganization: {
      "@type": "Organization",
      name: job.business.name,
    },
    jobLocation: {
      "@type": "Place",
      address: {
        "@type": "PostalAddress",
        addressLocality: job.city,
        addressRegion: job.state,
        addressCountry: "US",
      },
    },
    ...(job.workArrangement === "REMOTE" && { jobLocationType: "TELECOMMUTE" }),
    baseSalary: {
      "@type": "MonetaryAmount",
      currency: "USD",
      value: {
        "@type": "QuantitativeValue",
        value: Number(job.minHourlyRate),
        unitText: "HOUR",
      },
    },
    directApply: true,
  };
}
