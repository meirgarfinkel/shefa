"use client";

import { useState } from "react";
import Link from "next/link";
import { BriefcaseIcon, BuildingIcon, MessageSquareIcon, PlusIcon } from "lucide-react";
import { trpc } from "@/lib/trpc/provider";
import { Button } from "@/components/ui/button";
import { FilterTrigger } from "@/components/ui/filter-trigger";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { z } from "zod";
import { JobClosureReasonEnum } from "@/lib/schemas/jobPosting";

type JobClosureReason = z.infer<typeof JobClosureReasonEnum>;

const CLOSURE_OPTIONS: { value: JobClosureReason; label: string }[] = [
  { value: "FILLED_ON_SHEFA", label: "Position filled from Shefa" },
  { value: "FILLED_ELSEWHERE", label: "Position filled from somewhere else" },
  { value: "HIRING_FROZEN", label: "Hiring paused/frozen" },
  { value: "CANCELLED", label: "Role cancelled" },
  { value: "OTHER", label: "Other" },
];

function CloseJobModal({
  jobId,
  jobTitle,
  disabled,
}: {
  jobId: string;
  jobTitle: string;
  disabled: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<JobClosureReason | null>(null);
  const utils = trpc.useUtils();

  const closeJob = trpc.jobPosting.close.useMutation({
    onSuccess: () => {
      void utils.jobPosting.list.invalidate();
      setReason(null);
      setOpen(false);
    },
  });

  function handleOpenChange(v: boolean) {
    if (!v) setReason(null);
    setOpen(v);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button
          size="sm"
          variant="ghost"
          className="text-danger hover:bg-danger/15 h-7 text-xs transition-colors duration-100"
          disabled={disabled}
        >
          Close listing
        </Button>
      </DialogTrigger>
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
                name={`closureReason-${jobId}`}
                value={opt.value}
                checked={reason === opt.value}
                onChange={() => setReason(opt.value)}
              />
              <span className="text-sm">{opt.label}</span>
            </label>
          ))}
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="ghost"
            onClick={() => handleOpenChange(false)}
            disabled={closeJob.isPending}
          >
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

type Company = {
  id: string;
  companyName: string;
  city: string;
  state: string;
  activeJobsCount: number;
};

type Profile = {
  firstName: string;
  isResponsive: boolean;
  responsivenessUpdatedAt: Date | null;
};

export function EmployerDashboardClient({
  profile,
  companies,
}: {
  profile: Profile;
  companies: Company[];
}) {
  const { data: jobs } = trpc.jobPosting.list.useQuery({
    myJobs: true,
    status: ["ACTIVE"],
    sortBy: "newest",
  });
  const { data: recentApps } = trpc.employer.getRecentApplications.useQuery();

  const utils = trpc.useUtils();
  const updateJob = trpc.jobPosting.update.useMutation({
    onSuccess: () => void utils.jobPosting.list.invalidate(),
  });

  // All companies selected by default; unchecking narrows the active jobs list.
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    () => new Set(companies.map((c) => c.id)),
  );

  const activeJobs = jobs ?? [];
  const appFeed = recentApps ?? [];
  const multiCompany = companies.length > 1;
  const allSelected = selectedIds.size === companies.length;

  const filteredJobs = allSelected
    ? activeJobs
    : activeJobs.filter((job) => selectedIds.has(job.company.id));

  function toggleCompany(id: string) {
    setSelectedIds((prev) => {
      // Prevent deselecting the last company.
      if (prev.has(id) && prev.size === 1) return prev;
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div className="mx-auto flex max-w-6xl flex-col px-4 pt-8 pb-8 lg:h-[calc(100vh-64px)]">
      <div className="mb-6 flex items-center">
        <h1 className="text-popover text-2xl font-semibold">Hi, {profile.firstName}</h1>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="ml-2 rounded-full p-1.5">
                {profile.isResponsive ? (
                  <span className="border-success bg-success/50 border-2" />
                ) : (
                  <p className="text-xs">
                    {profile.responsivenessUpdatedAt != null ? "Not yet responsive" : ""}
                  </p>
                )}
              </div>
            </TooltipTrigger>

            <TooltipContent>
              <p>Responsiveness Rating</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {/* Quick actions */}
      <div className="mb-6 flex flex-wrap items-center gap-2">
        <Button asChild>
          <Link href="/employer/jobs/new">
            <BriefcaseIcon className="mr-1 size-4" />
            Post a job
          </Link>
        </Button>
        <Button asChild>
          <Link href="/messages">
            <MessageSquareIcon className="mr-1 size-4" />
            Messages
          </Link>
        </Button>
        <Button asChild variant="ghost">
          <Link href="/employer/company/new">
            <PlusIcon className="mr-1 size-4" />
            Add company
          </Link>
        </Button>

        {/* My companies modal */}
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="ghost">
              <BuildingIcon className="mr-1 size-4" />
              My companies
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>My companies</DialogTitle>
            </DialogHeader>
            <div className="flex flex-col gap-2">
              {companies.map((c) => (
                <div
                  key={c.id}
                  className="bg-blue-dark-2 flex items-center justify-between gap-3 rounded-md px-4 py-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{c.companyName}</p>
                    <p className="text-muted-foreground text-xs">
                      {c.city}, {c.state} · {c.activeJobsCount} active job
                      {c.activeJobsCount !== 1 ? "s" : ""}
                    </p>
                  </div>
                  <Button asChild size="sm" variant="ghost" className="h-7 shrink-0 text-xs">
                    <Link href={`/employer/company/${c.id}/edit`}>Edit</Link>
                  </Button>
                </div>
              ))}
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Two-column section — stacks on mobile, side-by-side with independent scroll on desktop */}
      <div className="grid gap-6 lg:min-h-0 lg:flex-1 lg:grid-cols-2">
        {/* Active jobs */}
        <div className="flex flex-col lg:min-h-0">
          <div className="mb-3 flex shrink-0 items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="font-medium">
                Active jobs{" "}
                <span className="bg-primary/30 text-popover rounded-full p-2">
                  {filteredJobs.length}
                </span>
              </h2>

              {multiCompany && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <FilterTrigger activeCount={allSelected ? undefined : selectedIds.size}>
                      Companies
                    </FilterTrigger>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start">
                    <DropdownMenuLabel>Filter by company</DropdownMenuLabel>
                    {companies.map((c) => (
                      <DropdownMenuCheckboxItem
                        key={c.id}
                        checked={selectedIds.has(c.id)}
                        onCheckedChange={() => toggleCompany(c.id)}
                        onSelect={(e) => e.preventDefault()}
                      >
                        {c.companyName}
                      </DropdownMenuCheckboxItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>

            <Link
              href="/employer/jobs"
              className="text-muted-foreground hover:text-popover-foreground text-xs transition-colors duration-100"
            >
              View all →
            </Link>
          </div>

          <div className="pr-1 lg:min-h-0 lg:flex-1 lg:overflow-y-auto">
            {filteredJobs.length === 0 ? (
              <div className="rounded-lg p-6 text-center">
                <p className="text-muted-foreground text-sm">No active jobs.</p>
                <Button asChild className="mt-3" size="sm">
                  <Link href="/employer/jobs/new">Post your first job</Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-3 pb-4">
                {filteredJobs.map((job) => (
                  <div
                    key={job.id}
                    className="bg-primary/30 hover:bg-primary/10 rounded-sm border bg-linear-to-b from-white/60 via-transparent to-transparent p-4 transition-colors duration-100"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate font-medium">{job.title}</p>
                      </div>
                      <p className="text-muted-foreground mt-0.5 text-xs">
                        {job.city}, {job.state} · ${Number(job.minHourlyRate).toFixed(0)}/hr ·{" "}
                        {job._count.applications} applicant
                        {job._count.applications !== 1 ? "s" : ""}
                        {multiCompany && <> · {job.company.name}</>}
                      </p>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-1.5">
                      <Button asChild size="sm" variant="ghost">
                        <Link href={`/employer/jobs/${job.id}/applications`}>
                          Applicants ({job._count.applications})
                        </Link>
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={updateJob.isPending}
                        onClick={() => updateJob.mutate({ id: job.id, status: "PAUSED" })}
                      >
                        Pause
                      </Button>
                      <Button asChild size="sm" variant="ghost">
                        <Link href={`/employer/jobs/${job.id}/edit`}>Edit</Link>
                      </Button>
                      <CloseJobModal
                        jobId={job.id}
                        jobTitle={job.title}
                        disabled={updateJob.isPending}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* New applicants */}
        <div className="flex flex-col lg:min-h-0">
          <h2 className="mb-3 shrink-0 font-medium">New applicants</h2>

          <div className="lg:min-h-0 lg:flex-1 lg:overflow-y-auto">
            {appFeed.length === 0 ? (
              <div className="bg-primary rounded-lg border bg-linear-to-b from-white/60 via-transparent to-transparent p-4">
                <p className="text-muted-foreground text-sm">No applicants yet.</p>
              </div>
            ) : (
              <div className="overflow-hidden rounded-lg pb-4">
                {appFeed.map((app) => (
                  <div
                    key={app.id}
                    className="hover:bg-primary/30 flex items-center justify-between gap-3 px-4 py-3 transition-colors duration-100"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {app.seeker.seekerProfile?.firstName} {app.seeker.seekerProfile?.lastName}
                      </p>
                      <p className="text-muted-foreground text-xs">
                        {app.job.title}
                        {multiCompany && <> · {app.job.company.name}</>}
                        {" · "}
                        {timeAgo(app.createdAt)}
                      </p>
                    </div>
                    <Button asChild size="sm" variant="ghost" className="h-7 shrink-0 text-xs">
                      <Link href={`/employer/jobs/${app.jobId}/applications`}>View</Link>
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
