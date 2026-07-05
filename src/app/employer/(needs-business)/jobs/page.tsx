"use client";

import { useState } from "react";
import Link from "next/link";
import { trpc } from "@/lib/trpc/provider";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import type { JobStatus } from "@/db/schema";
import { CloseJobModal } from "@/components/close-job-modal";
import { EmployerJobCard } from "@/components/employer-job-card";
import { Panel } from "@/components/ui/panel";

const FILTER_TABS: { value: "all" | JobStatus; label: string }[] = [
  { value: "all", label: "All" },
  { value: "ACTIVE", label: "Active" },
  { value: "PAUSED", label: "Paused" },
  { value: "CLOSED", label: "Closed" },
];

export default function EmployerJobsPage() {
  const [statusFilter, setStatusFilter] = useState<"all" | JobStatus>("all");
  const [closingJob, setClosingJob] = useState<{ id: string; title: string } | null>(null);

  const { data: businesses, isLoading: businessesLoading } = trpc.business.listMine.useQuery();
  const multiBusiness = (businesses?.length ?? 0) > 1;
  const utils = trpc.useUtils();

  const listInput = {
    myJobs: true,
    status: statusFilter !== "all" ? [statusFilter] : undefined,
  };

  const { data: jobs, isLoading: jobsLoading } = trpc.jobPosting.list.useQuery(listInput, {
    enabled: businesses !== undefined && businesses.length > 0,
  });

  const updateJob = trpc.jobPosting.update.useMutation({
    // Optimistic: flip the status badge immediately; the item settles into the
    // correct filter bucket once the server confirms and the list refetches.
    onMutate: async ({ id, status }) => {
      if (!status) return;
      await utils.jobPosting.list.cancel(listInput);
      const previous = utils.jobPosting.list.getData(listInput);
      utils.jobPosting.list.setData(listInput, (old) =>
        old?.map((job) => (job.id === id ? { ...job, status } : job)),
      );
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) utils.jobPosting.list.setData(listInput, ctx.previous);
    },
    onSettled: () => void utils.jobPosting.list.invalidate(),
  });
  const duplicateJob = trpc.jobPosting.duplicate.useMutation({
    onSuccess: () => void utils.jobPosting.list.invalidate(),
  });
  const reopenJob = trpc.jobPosting.reopen.useMutation({
    onSuccess: () => void utils.jobPosting.list.invalidate(),
  });
  const confirmFreshness = trpc.jobPosting.confirmFreshness.useMutation({
    onSuccess: () => void utils.jobPosting.list.invalidate(),
  });

  const isLoading = businessesLoading || jobsLoading;
  const isPending =
    updateJob.isPending ||
    duplicateJob.isPending ||
    confirmFreshness.isPending ||
    reopenJob.isPending;

  const pageSubtitle = multiBusiness
    ? "All businesses"
    : (businesses?.[0]?.businessName ?? undefined);

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
              className={`glass bg-message-green/15 flex cursor-pointer rounded-full px-3 py-1.5 text-sm ${
                statusFilter === tab.value
                  ? "bg-popover/90 border-none text-white shadow-[inset_1px_-1px_4px_rgba(255,255,255,0.5),inset_-1px_1px_4px_rgb(255,255,255)]"
                  : "hover:bg-orange/15 transition-all duration-100 hover:scale-105"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {isLoading && <div className="py-16 text-center text-sm">Your work matters.</div>}

        {!isLoading && jobs?.length === 0 && (
          <Panel className="bg-secondary/40 rounded-lg py-16 text-center">
            {statusFilter !== "all"
              ? `No ${statusFilter.toLowerCase()} job postings.`
              : "No job postings yet."}
          </Panel>
        )}

        {!isLoading && jobs && jobs.length > 0 && (
          <div className="space-y-3">
            {jobs.map((job) => (
              <EmployerJobCard
                key={job.id}
                job={job}
                multiBusiness={multiBusiness}
                isPending={isPending}
                applicationsCount={job._count.applications}
                onConfirmFreshness={() => confirmFreshness.mutate({ id: job.id })}
                onPause={() => updateJob.mutate({ id: job.id, status: "PAUSED" })}
                onUnpause={() => updateJob.mutate({ id: job.id, status: "ACTIVE" })}
                onReopen={() => reopenJob.mutate({ id: job.id })}
                onDuplicate={() => duplicateJob.mutate({ id: job.id })}
                onClose={() => setClosingJob({ id: job.id, title: job.title })}
              />
            ))}
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
