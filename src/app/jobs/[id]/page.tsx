"use client";

import { use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc/provider";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

const JOB_TYPE_LABELS: Record<string, string> = {
  FULL_TIME: "Full-time",
  PART_TIME: "Part-time",
  EITHER: "Full or Part-time",
};

const ARRANGEMENT_LABELS: Record<string, string> = {
  ON_SITE: "On-site",
  REMOTE: "Remote",
  HYBRID: "Hybrid",
};

const DAY_LABELS: Record<string, string> = {
  SUN: "Sun",
  MON: "Mon",
  TUE: "Tue",
  WED: "Wed",
  THU: "Thu",
  FRI: "Fri",
  SAT: "Sat",
};

const DAY_ORDER = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

export default function JobDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();

  const { data: job, isLoading, error } = trpc.jobPosting.getById.useQuery({ id });

  if (isLoading) {
    return (
      <div className="text-muted-foreground mx-auto max-w-3xl px-4 py-16 text-center">Loading…</div>
    );
  }

  if (error || !job) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <p className="text-muted-foreground">This job posting was not found.</p>
        <Button variant="outline" className="mt-4" onClick={() => router.push("/jobs")}>
          Back to listings
        </Button>
      </div>
    );
  }

  const sortedDays = [...job.workDays].sort((a, b) => DAY_ORDER.indexOf(a) - DAY_ORDER.indexOf(b));

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      {/* Back link */}
      <Link
        href="/jobs"
        className="text-muted-foreground hover:text-foreground mb-6 inline-flex items-center gap-1 text-sm"
      >
        ← Back to listings
      </Link>

      {/* Header */}
      <div className="mt-4 mb-6">
        <p className="text-muted-foreground text-sm font-medium">
          {job.employerProfile.companyName}
        </p>
        <h1 className="mt-1 text-3xl font-semibold">{job.title}</h1>

        <div className="mt-3 flex flex-wrap gap-2">
          <span className="bg-muted rounded-full px-3 py-1 text-sm">
            {job.city}, {job.state}
          </span>
          <span className="bg-muted rounded-full px-3 py-1 text-sm">
            {JOB_TYPE_LABELS[job.jobType] ?? job.jobType}
          </span>
          <span className="bg-muted rounded-full px-3 py-1 text-sm">
            {ARRANGEMENT_LABELS[job.workArrangement] ?? job.workArrangement}
          </span>
          {job.workAuthRequired && (
            <span className="bg-muted rounded-full px-3 py-1 text-sm">Work auth required</span>
          )}
        </div>
      </div>

      <Separator />

      {/* Quick facts */}
      <div className="my-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
        <div>
          <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">Pay</p>
          <p className="mt-1 text-sm font-semibold">
            From ${Number(job.minHourlyRate).toFixed(2)}/hr
          </p>
          {job.payNotes && <p className="text-muted-foreground mt-0.5 text-xs">{job.payNotes}</p>}
        </div>

        {sortedDays.length > 0 && (
          <div>
            <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
              Work days
            </p>
            <p className="mt-1 text-sm">{sortedDays.map((d) => DAY_LABELS[d] ?? d).join(", ")}</p>
            {job.scheduleNotes && (
              <p className="text-muted-foreground mt-0.5 text-xs">{job.scheduleNotes}</p>
            )}
          </div>
        )}

        {job.requiredLanguages.length > 0 && (
          <div>
            <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
              Languages
            </p>
            <p className="mt-1 text-sm">
              {job.requiredLanguages.map((l) => l.language.name).join(", ")}
            </p>
          </div>
        )}
      </div>

      <Separator />

      {/* Opportunity callouts */}
      {(job.whatWeTeach || job.whatWereLookingFor) && (
        <>
          <div className="my-6 space-y-4">
            {job.whatWeTeach && (
              <div className="rounded-lg border p-4">
                <h2 className="mb-1 text-sm font-semibold">We&apos;ll teach you</h2>
                <p className="text-muted-foreground text-sm">{job.whatWeTeach}</p>
              </div>
            )}
            {job.whatWereLookingFor && (
              <div className="rounded-lg border p-4">
                <h2 className="mb-1 text-sm font-semibold">What we&apos;re looking for</h2>
                <p className="text-muted-foreground text-sm">{job.whatWereLookingFor}</p>
              </div>
            )}
          </div>
          <Separator />
        </>
      )}

      {/* Description */}
      <div className="my-6">
        <h2 className="mb-3 text-lg font-semibold">About the role</h2>
        <p className="text-muted-foreground text-sm whitespace-pre-wrap">{job.description}</p>
      </div>

      {/* Preferred skills */}
      {job.preferredSkills.length > 0 && (
        <>
          <Separator />
          <div className="my-6">
            <h2 className="mb-3 text-sm font-semibold">Preferred skills</h2>
            <div className="flex flex-wrap gap-2">
              {job.preferredSkills.map((ps) => (
                <span key={ps.skill.id} className="bg-muted rounded-full px-3 py-1 text-sm">
                  {ps.skill.name}
                </span>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Apply CTA */}
      <Separator />
      <div className="mt-8">
        <Button className="w-full sm:w-auto" disabled>
          Apply — coming soon
        </Button>
        <p className="text-muted-foreground mt-2 text-xs">
          Applications will open in a future update.
        </p>
      </div>
    </div>
  );
}
