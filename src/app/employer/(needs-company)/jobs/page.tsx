"use client";

import { useState } from "react";
import Link from "next/link";
import { trpc } from "@/lib/trpc/provider";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { PageHeader } from "@/components/ui/page-header";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { z } from "zod";
import { JobClosureReasonEnum } from "@/lib/schemas/jobPosting";
import type { JobStatus } from "@/db/schema";
import { CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";

type JobClosureReason = z.infer<typeof JobClosureReasonEnum>;

const FILTER_TABS: { value: "all" | JobStatus; label: string }[] = [
  { value: "all", label: "All" },
  { value: "ACTIVE", label: "Active" },
  { value: "PAUSED", label: "Paused" },
  { value: "CLOSED", label: "Closed" },
];

const CLOSURE_OPTIONS: { value: JobClosureReason; label: string }[] = [
  { value: "FILLED_ON_SHEFA", label: "Position filled from Shefa" },
  { value: "FILLED_ELSEWHERE", label: "Position filled from somewhere else" },
  { value: "HIRING_FROZEN", label: "Hiring paused/frozen" },
  { value: "CANCELLED", label: "Role cancelled" },
  { value: "OTHER", label: "Other" },
];

const FRESHNESS_DAYS = 7;

function CloseJobModal({
  jobId,
  jobTitle,
  open,
  onClose,
}: {
  jobId: string;
  jobTitle: string;
  open: boolean;
  onClose: () => void;
}) {
  const [reason, setReason] = useState<JobClosureReason | null>(null);
  const utils = trpc.useUtils();

  const closeJob = trpc.jobPosting.close.useMutation({
    onSuccess: () => {
      void utils.jobPosting.list.invalidate();
      setReason(null);
      onClose();
    },
  });

  function handleClose() {
    setReason(null);
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Close &ldquo;{jobTitle}&rdquo;?</DialogTitle>
        </DialogHeader>

        <p className="text-muted-foreground text-sm">Why are you closing this listing?</p>

        <div className="space-y-2">
          {CLOSURE_OPTIONS.map((opt) => (
            <label
              key={opt.value}
              className={`flex cursor-pointer items-center gap-3 rounded-md px-3 py-2.5 transition-colors duration-100 ${
                reason === opt.value ? "bg-blue-dark-2" : "hover:bg-blue-dark-3"
              }`}
            >
              <input
                type="radio"
                name="closureReason"
                value={opt.value}
                checked={reason === opt.value}
                onChange={() => setReason(opt.value)}
              />
              <span className="text-sm">{opt.label}</span>
            </label>
          ))}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={handleClose} disabled={closeJob.isPending}>
            Cancel
          </Button>
          <Button
            className="bg-danger/15 text-danger hover:bg-danger/25 transition-colors duration-100"
            disabled={!reason || closeJob.isPending}
            onClick={() => reason && closeJob.mutate({ id: jobId, reason })}
          >
            {closeJob.isPending ? "Closing…" : "Close listing"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function EmployerJobsPage() {
  const [statusFilter, setStatusFilter] = useState<"all" | JobStatus>("all");
  const [closingJob, setClosingJob] = useState<{ id: string; title: string } | null>(null);

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
  const duplicateJob = trpc.jobPosting.duplicate.useMutation({
    onSuccess: () => void utils.jobPosting.list.invalidate(),
  });
  const confirmFreshness = trpc.jobPosting.confirmFreshness.useMutation({
    onSuccess: () => void utils.jobPosting.list.invalidate(),
  });

  const isLoading = companiesLoading || jobsLoading;
  const isPending = updateJob.isPending || duplicateJob.isPending || confirmFreshness.isPending;

  const pageSubtitle = multiCompany ? "All companies" : (companies?.[0]?.companyName ?? undefined);
  const router = useRouter();

  return (
    <div className="p-5">
      <div className="mx-auto max-w-3xl">
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
        <div className="mb-4 flex gap-2">
          {FILTER_TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setStatusFilter(tab.value)}
              className={`bg-muted/10 flex cursor-pointer rounded-full px-3 py-1.5 text-sm transition-colors duration-100 ${
                statusFilter === tab.value
                  ? "bg-popover bg-linear-to-b from-white/20 via-transparent to-transparent text-white"
                  : "from-popover/20 hover:bg-popover/30 bg-linear-to-t via-transparent to-transparent"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {isLoading && (
          <div className="text-muted-foreground py-16 text-center text-sm">Loading…</div>
        )}

        {!isLoading && jobs?.length === 0 && (
          <div className="bg-secondary text-muted-foreground rounded-lg py-16 text-center">
            {statusFilter !== "all"
              ? `No ${statusFilter.toLowerCase()} job postings.`
              : "No job postings yet."}
          </div>
        )}

        {!isLoading && jobs && jobs.length > 0 && (
          <div className="space-y-3">
            {jobs.map((job) => {
              const isClosed = job.status === "CLOSED";
              const isActive = job.status === "ACTIVE";
              const daysSinceVerified = Math.floor(
                (Date.now() - new Date(job.lastVerifiedAt).getTime()) / (1000 * 60 * 60 * 24),
              );
              const showFreshnessBanner = isActive && daysSinceVerified >= FRESHNESS_DAYS;
              const daysUntilAutoPause = isActive ? Math.max(0, 28 - daysSinceVerified) : null;

              return (
                <div
                  key={job.id}
                  className="bg-primary/30 relative cursor-pointer rounded-sm border bg-linear-to-b from-white/60 via-transparent to-transparent p-5 shadow-md backdrop-blur-xs duration-200 hover:shadow-sm hover:backdrop-blur-sm"
                  onClick={() => router.push(`/jobs/${job.id}`)}
                >
                  <div className="space-y-2 md:flex md:items-start md:justify-between md:space-y-0">
                    {/* Mobile: title + status on same row */}
                    <div className="flex items-start justify-between gap-3 md:block">
                      <CardTitle className="min-w-0 text-lg md:text-xl">{job.title}</CardTitle>

                      <div className="shrink-0 md:hidden">
                        <StatusBadge
                          status={job.status as JobStatus}
                          closureReason={
                            (job as { closureReason?: JobClosureReason | null }).closureReason
                          }
                        />
                      </div>
                    </div>

                    {/* Freshness banner */}
                    {showFreshnessBanner && (
                      <div className="flex items-center gap-2 md:mx-auto md:gap-3">
                        <Button
                          size="sm"
                          variant="light"
                          className="text-success w-fit"
                          disabled={isPending}
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            confirmFreshness.mutate({ id: job.id });
                          }}
                        >
                          I confirm job is still open
                        </Button>

                        {daysUntilAutoPause !== null && (
                          <span
                            className={cn(
                              "text-xs md:text-sm",
                              daysUntilAutoPause <= 7
                                ? "text-danger"
                                : daysUntilAutoPause <= 14
                                  ? "text-orange"
                                  : "text-muted-foreground",
                            )}
                          >
                            auto-pauses in {daysUntilAutoPause}d
                          </span>
                        )}
                      </div>
                    )}

                    {/* Desktop status badge */}
                    <div className="hidden md:block">
                      <StatusBadge
                        status={job.status as JobStatus}
                        closureReason={
                          (job as { closureReason?: JobClosureReason | null }).closureReason
                        }
                      />
                    </div>
                  </div>

                  <p className="text-muted-foreground relative z-10 mt-0.5 text-xs">
                    {multiCompany && <>{job.company.name}</>} · {job.city}, {job.state} · $
                    {Number(job.minHourlyRate).toFixed(0)}/hr
                  </p>

                  <div className="relative z-10 mt-3 flex flex-wrap justify-between">
                    <div className="flex gap-1.5">
                      {!isClosed && (
                        <Button
                          asChild
                          variant="light"
                          size="sm"
                          className="h-7 text-xs"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Link href={`/employer/jobs/${job.id}/applications`}>
                            Applicants ({job._count.applications})
                          </Link>
                        </Button>
                      )}
                      {!isClosed && (
                        <Button
                          asChild
                          variant="light"
                          size="sm"
                          className="h-7 text-xs"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Link href={`/employer/jobs/${job.id}/edit`}>Edit</Link>
                        </Button>
                      )}
                      {isActive && (
                        <Button
                          variant="light"
                          size="sm"
                          className="h-7 text-xs"
                          disabled={isPending}
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            updateJob.mutate({ id: job.id, status: "PAUSED" });
                          }}
                        >
                          Pause
                        </Button>
                      )}
                      {job.status === "PAUSED" && (
                        <Button
                          variant="light"
                          size="sm"
                          className="h-7 text-xs"
                          disabled={isPending}
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            updateJob.mutate({ id: job.id, status: "ACTIVE" });
                          }}
                        >
                          Unpause
                        </Button>
                      )}
                      <Button
                        variant="light"
                        size="sm"
                        className="h-7 text-xs"
                        disabled={isPending}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          duplicateJob.mutate({ id: job.id });
                        }}
                      >
                        Duplicate
                      </Button>
                    </div>
                    <div>
                      {!isClosed && (
                        <Button
                          variant="light"
                          size="sm"
                          className="text-danger hover:bg-danger/15 h-7 text-xs transition-colors duration-100"
                          disabled={isPending}
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setClosingJob({ id: job.id, title: job.title });
                          }}
                        >
                          Close listing
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {closingJob && (
          <CloseJobModal
            jobId={closingJob.id}
            jobTitle={closingJob.title}
            open={true}
            onClose={() => setClosingJob(null)}
          />
        )}
      </div>
    </div>
  );
}
