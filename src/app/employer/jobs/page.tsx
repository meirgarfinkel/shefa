"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc/provider";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { PageHeader } from "@/components/ui/page-header";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { JobStatus } from "@prisma/client";

const STATUS_OPTIONS: { value: "all" | JobStatus; label: string }[] = [
  { value: "all", label: "All statuses" },
  { value: "ACTIVE", label: "Active" },
  { value: "DRAFT", label: "Draft" },
  { value: "PAUSED", label: "Paused" },
  { value: "FILLED", label: "Filled" },
  { value: "EXPIRED", label: "Expired" },
  { value: "CLOSED", label: "Closed" },
];

export default function EmployerJobsPage() {
  const router = useRouter();
  const [statusFilter, setStatusFilter] = useState<"all" | JobStatus>("all");

  const { data: profile, isLoading: profileLoading } = trpc.employer.getProfile.useQuery();

  const { data: jobs, isLoading: jobsLoading } = trpc.jobPosting.list.useQuery(
    {
      employerProfileId: profile?.id,
      status: statusFilter !== "all" ? [statusFilter] : undefined,
    },
    { enabled: !!profile?.id },
  );

  if (!profileLoading && !profile) {
    router.replace("/employer/profile/new");
    return null;
  }

  const isLoading = profileLoading || jobsLoading;

  return (
    <div className="mx-auto max-w-3xl px-3 py-8 md:px-8">
      <PageHeader
        title="Your job postings"
        description={profile?.companyName}
        actions={
          <Button asChild>
            <Link href="/employer/jobs/new">Post a job</Link>
          </Button>
        }
      />

      {/* Status filter */}
      <div className="mb-4 flex items-center gap-2">
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as "all" | JobStatus)}>
          <SelectTrigger className="h-8 w-40 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent position="popper">
            {STATUS_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading && <div className="text-muted-foreground py-16 text-center text-sm">Loading…</div>}

      {!isLoading && jobs?.length === 0 && (
        <div className="bg-dark text-muted-foreground rounded-md py-16 text-center text-sm">
          {statusFilter !== "all" ? (
            `No ${statusFilter.toLowerCase()} job postings.`
          ) : (
            <>
              No job postings yet.{" "}
              <Link href="/employer/jobs/new" className="text-light underline underline-offset-2">
                Post your first job.
              </Link>
            </>
          )}
        </div>
      )}

      {!isLoading && jobs && jobs.length > 0 && (
        <div className="bg-dark overflow-hidden rounded-md">
          {jobs.map((job, i) => (
            <div
              key={job.id}
              className={`flex items-center gap-4 px-4 py-3 ${
                i < jobs.length - 1 ? "border-b" : ""
              }`}
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate font-medium">{job.title}</p>
                  <StatusBadge status={job.status} />
                </div>
                <p className="text-muted-foreground mt-0.5 text-xs">
                  {job.city}, {job.state} · Posted{" "}
                  {new Date(job.createdAt).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </p>
              </div>
              <div className="flex shrink-0 gap-2">
                <Button asChild variant="ghost" size="sm">
                  <Link href={`/employer/jobs/${job.id}/applications`}>Applications</Link>
                </Button>
                <Button asChild variant="ghost" size="sm">
                  <Link href={`/employer/jobs/${job.id}/edit`}>Edit</Link>
                </Button>
                <Button asChild variant="ghost" size="sm">
                  <Link href={`/jobs/${job.id}`}>View</Link>
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
