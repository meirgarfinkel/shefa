"use client";

import { useState } from "react";
import Link from "next/link";
import { trpc } from "@/lib/trpc/provider";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import type { JobStatus } from "@/db/schema";
import { CloseJobModal } from "@/components/close-job-modal";
import { EmployerJobCard } from "@/components/employer-job-card";

const FILTER_TABS: { value: "all" | JobStatus; label: string }[] = [
  { value: "all", label: "All" },
  { value: "ACTIVE", label: "Active" },
  { value: "PAUSED", label: "Paused" },
  { value: "CLOSED", label: "Closed" },
];

export default function EmployerJobsPage() {
  const [statusFilter, setStatusFilter] = useState<"all" | JobStatus>("all");
  const [closingJob, setClosingJob] = useState<{ id: string; title: string } | null>(null);

  const { data: companies, isLoading: companiesLoading } = trpc.company.listMine.useQuery();
  const multiCompany = (companies?.length ?? 0) > 1;
  const utils = trpc.useUtils();

  const listInput = {
    myJobs: true,
    status: statusFilter !== "all" ? [statusFilter] : undefined,
  };

  const { data: jobs, isLoading: jobsLoading } = trpc.jobPosting.list.useQuery(listInput, {
    enabled: companies !== undefined && companies.length > 0,
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

  const isLoading = companiesLoading || jobsLoading;
  const isPending =
    updateJob.isPending ||
    duplicateJob.isPending ||
    confirmFreshness.isPending ||
    reopenJob.isPending;

  const pageSubtitle = multiCompany ? "All companies" : (companies?.[0]?.companyName ?? undefined);

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
          <div className="text-muted-foreground py-16 text-center text-sm">Your work matters.</div>
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
            {jobs.map((job) => (
              <EmployerJobCard
                key={job.id}
                job={job}
                multiCompany={multiCompany}
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
