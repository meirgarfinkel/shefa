import { describe, it, expect } from "vitest";
import {
  buildJobPostingJsonLd,
  jobValidThrough,
  jobPostingUrl,
  type JobPostingSeoInput,
} from "../job-posting";

const BASE = "https://shefa.example.com";

function makeJob(overrides: Partial<JobPostingSeoInput> = {}): JobPostingSeoInput {
  return {
    id: "job123",
    title: "Kitchen Assistant",
    description: "Help in a busy kitchen. No experience needed.",
    jobType: "FULL_TIME",
    workArrangement: "ON_SITE",
    country: "US",
    city: "Brooklyn",
    state: "NY",
    minHourlyRate: "18.50",
    createdAt: new Date("2026-06-01T00:00:00.000Z"),
    lastVerifiedAt: new Date("2026-06-01T00:00:00.000Z"),
    business: { name: "Sunrise Diner" },
    ...overrides,
  };
}

describe("jobValidThrough", () => {
  it("is 28 days after last verification (matches freshness auto-pause)", () => {
    const result = jobValidThrough(new Date("2026-06-01T00:00:00.000Z"));
    expect(result.toISOString()).toBe("2026-06-29T00:00:00.000Z");
  });
});

describe("jobPostingUrl", () => {
  it("builds an absolute job URL", () => {
    expect(jobPostingUrl(BASE, "abc")).toBe("https://shefa.example.com/jobs/abc");
  });
});

describe("buildJobPostingJsonLd", () => {
  it("emits a valid JobPosting with required fields", () => {
    const ld = buildJobPostingJsonLd(makeJob(), BASE);
    expect(ld["@type"]).toBe("JobPosting");
    expect(ld.title).toBe("Kitchen Assistant");
    expect(ld.datePosted).toBe("2026-06-01T00:00:00.000Z");
    expect(ld.validThrough).toBe("2026-06-29T00:00:00.000Z");
    expect(ld.url).toBe("https://shefa.example.com/jobs/job123");
    expect(ld.hiringOrganization.name).toBe("Sunrise Diner");
    expect(ld.jobLocation.address.addressLocality).toBe("Brooklyn");
    expect(ld.jobLocation.address.addressRegion).toBe("NY");
    expect(ld.jobLocation.address.addressCountry).toBe("US");
  });

  it("emits the job's country and currency for an Israeli posting", () => {
    const ld = buildJobPostingJsonLd(
      makeJob({ country: "IL", city: "Tel Aviv", state: "IL" }),
      BASE,
    );
    expect(ld.jobLocation.address.addressCountry).toBe("IL");
    expect(ld.baseSalary.currency).toBe("ILS");
  });

  it("maps minHourlyRate to an hourly MonetaryAmount as a number", () => {
    const ld = buildJobPostingJsonLd(makeJob({ minHourlyRate: "18.50" }), BASE);
    expect(ld.baseSalary.value.value).toBe(18.5);
    expect(ld.baseSalary.value.unitText).toBe("HOUR");
    expect(ld.baseSalary.currency).toBe("USD");
  });

  it("maps EITHER to both employment types", () => {
    const ld = buildJobPostingJsonLd(makeJob({ jobType: "EITHER" }), BASE);
    expect(ld.employmentType).toEqual(["FULL_TIME", "PART_TIME"]);
  });

  it("maps PART_TIME directly", () => {
    const ld = buildJobPostingJsonLd(makeJob({ jobType: "PART_TIME" }), BASE);
    expect(ld.employmentType).toBe("PART_TIME");
  });

  it("adds jobLocationType TELECOMMUTE only for remote roles", () => {
    expect(buildJobPostingJsonLd(makeJob({ workArrangement: "REMOTE" }), BASE)).toHaveProperty(
      "jobLocationType",
      "TELECOMMUTE",
    );
    expect(buildJobPostingJsonLd(makeJob({ workArrangement: "ON_SITE" }), BASE)).not.toHaveProperty(
      "jobLocationType",
    );
  });
});
