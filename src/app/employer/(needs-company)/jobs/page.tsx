"use client";

import { useState } from "react";
import Link from "next/link";
import { trpc } from "@/lib/trpc/provider";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { PageHeader } from "@/components/ui/page-header";
import type { JobStatus } from "@prisma/client";

const FILTER_TABS: { value: "all" | JobStatus; label: string }[] = [
  { value: "all", label: "All" },
  { value: "ACTIVE", label: "Active" },
  { value: "PAUSED", label: "Paused" },
  { value: "FILLED", label: "Filled" },
];

const FRESHNESS_DAYS = 7;

function timeAgo(date: Date | string): string {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function EmployerJobsPage() {
  const [statusFilter, setStatusFilter] = useState<"all" | JobStatus>("all");

  const { data: companies, isLoading: companiesLoading } = trpc.company.listMine.useQuery();
  const multiCompany = (companies?.length ?? 0) > 1;
  const utils = trpc.useUtils();

  const { data: jobs, isLoading: jobsLoading } = trpc.jobPosting.list.useQuery(
    {
      myJobs: true,
      status: statusFilter !== "all" ? [statusFilter] : undefined,
    },
    { enabled: companies !== undefined && companies.length > 0 },
  );

  const updateJob = trpc.jobPosting.update.useMutation({
    onSuccess: () => void utils.jobPosting.list.invalidate(),
  });
  const closeJob = trpc.jobPosting.delete.useMutation({
    onSuccess: () => void utils.jobPosting.list.invalidate(),
  });
  const duplicateJob = trpc.jobPosting.duplicate.useMutation({
    onSuccess: () => void utils.jobPosting.list.invalidate(),
  });
  const confirmFreshness = trpc.jobPosting.confirmFreshness.useMutation({
    onSuccess: () => void utils.jobPosting.list.invalidate(),
  });

  const isLoading = companiesLoading || jobsLoading;
  const isPending =
    updateJob.isPending ||
    closeJob.isPending ||
    duplicateJob.isPending ||
    confirmFreshness.isPending;

  const pageSubtitle = multiCompany ? "All companies" : (companies?.[0]?.companyName ?? undefined);

  return (
    <div className="mx-auto max-w-3xl px-3 py-8 md:px-8">
      <PageHeader
        title="Job postings"
        description={pageSubtitle}
        actions={
          <Button asChild>
            <Link href="/employer/jobs/new">Post a job</Link>
          </Button>
        }
      />

      {/* Filter tabs */}
      <div className="mb-4 flex gap-1">
        {FILTER_TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setStatusFilter(tab.value)}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors duration-100 ${
              statusFilter === tab.value
                ? "bg-primary/20 text-primary"
                : "text-muted-foreground hover:bg-blue-dark-3"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {isLoading && <div className="text-muted-foreground py-16 text-center text-sm">Loading…</div>}

      {!isLoading && jobs?.length === 0 && (
        <div className="bg-popover text-muted-foreground rounded-lg py-16 text-center text-sm">
          {statusFilter !== "all" ? (
            `No ${statusFilter.toLowerCase()} job postings.`
          ) : (
            <>
              No job postings yet.{" "}
              <Link
                href="/employer/jobs/new"
                className="text-popover-foreground underline underline-offset-2"
              >
                Post your first job.
              </Link>
            </>
          )}
        </div>
      )}

      {!isLoading && jobs && jobs.length > 0 && (
        <div className="space-y-3">
          {jobs.map((job) => {
            const isClosed = job.status === "CLOSED" || job.status === "EXPIRED";
            const isActive = job.status === "ACTIVE";
            const daysSinceVerified = Math.floor(
              (Date.now() - new Date(job.lastVerifiedAt).getTime()) / (1000 * 60 * 60 * 24),
            );
            const showFreshnessBanner = isActive && daysSinceVerified >= FRESHNESS_DAYS;

            return (
              <div key={job.id} className="bg-popover overflow-hidden rounded-lg">
                {/* Freshness banner */}
                {showFreshnessBanner && (
                  <div className="border-warning/20 bg-warning/10 flex items-center justify-between gap-3 border-b px-4 py-2.5">
                    <p className="text-warning text-xs font-medium">Is this job still open?</p>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        className="bg-success/15 text-success hover:bg-success/25 h-6 px-2 text-xs transition-colors duration-100"
                        disabled={isPending}
                        onClick={() => confirmFreshness.mutate({ id: job.id })}
                      >
                        Yes, still hiring
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-muted-foreground hover:bg-blue-dark-3 h-6 px-2 text-xs transition-colors duration-100"
                        disabled={isPending}
                        onClick={() => updateJob.mutate({ id: job.id, status: "PAUSED" })}
                      >
                        Pause job
                      </Button>
                    </div>
                  </div>
                )}

                <div className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate font-medium">{job.title}</p>
                        <StatusBadge status={job.status} />
                      </div>
                      <p className="text-muted-foreground mt-0.5 text-xs">
                        {job.city}, {job.state} · ${Number(job.minHourlyRate).toFixed(0)}/hr
                        {multiCompany && <> · {job.company.name}</>}
                      </p>
                      <p className="text-muted-foreground text-xs">
                        {job._count.applications} applicant
                        {job._count.applications !== 1 ? "s" : ""} · posted {timeAgo(job.createdAt)}
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {!isClosed && (
                      <Button asChild variant="ghost" size="sm" className="h-7 text-xs">
                        <Link href={`/employer/jobs/${job.id}/applications`}>
                          Applicants ({job._count.applications})
                        </Link>
                      </Button>
                    )}
                    {!isClosed && (
                      <Button asChild variant="ghost" size="sm" className="h-7 text-xs">
                        <Link href={`/employer/jobs/${job.id}/edit`}>Edit</Link>
                      </Button>
                    )}
                    {isActive && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs"
                        disabled={isPending}
                        onClick={() => updateJob.mutate({ id: job.id, status: "PAUSED" })}
                      >
                        Pause
                      </Button>
                    )}
                    {job.status === "PAUSED" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs"
                        disabled={isPending}
                        onClick={() => updateJob.mutate({ id: job.id, status: "ACTIVE" })}
                      >
                        Unpause
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs"
                      disabled={isPending}
                      onClick={() => duplicateJob.mutate({ id: job.id })}
                    >
                      Duplicate
                    </Button>
                    {!isClosed && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-danger hover:bg-danger/15 h-7 text-xs transition-colors duration-100"
                        disabled={isPending}
                        onClick={() => closeJob.mutate({ id: job.id })}
                      >
                        Close
                      </Button>
                    )}
                    <Button
                      asChild
                      variant="ghost"
                      size="sm"
                      className="text-muted-foreground h-7 text-xs"
                    >
                      <Link href={`/jobs/${job.id}`}>Preview</Link>
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
