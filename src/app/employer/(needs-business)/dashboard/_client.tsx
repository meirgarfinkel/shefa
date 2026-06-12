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
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { CardTitle } from "@/components/ui/card";
import { useRouter } from "next/navigation";
import { pluralize, getInitials } from "@/lib/utils";
import { CloseJobModal } from "@/components/close-job-modal";

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

type Business = {
  id: string;
  businessName: string;
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
  businesses,
}: {
  profile: Profile;
  businesses: Business[];
}) {
  const listInput = {
    myJobs: true,
    status: ["ACTIVE" as const],
    sortBy: "newest" as const,
  };

  const { data: jobs } = trpc.jobPosting.list.useQuery(listInput);
  const { data: recentApps } = trpc.employer.getRecentApplications.useQuery();

  const utils = trpc.useUtils();
  const updateJob = trpc.jobPosting.update.useMutation({
    // Optimistic: this feed only shows ACTIVE jobs, so pausing one drops it from
    // the list immediately, then the server confirmation reconciles on settle.
    onMutate: async ({ id }) => {
      await utils.jobPosting.list.cancel(listInput);
      const previous = utils.jobPosting.list.getData(listInput);
      utils.jobPosting.list.setData(listInput, (old) => old?.filter((job) => job.id !== id));
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) utils.jobPosting.list.setData(listInput, ctx.previous);
    },
    onSettled: () => void utils.jobPosting.list.invalidate(),
  });

  // All businesses selected by default; unchecking narrows the active jobs list.
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    () => new Set(businesses.map((c) => c.id)),
  );
  const [closingJob, setClosingJob] = useState<{ id: string; title: string } | null>(null);

  const activeJobs = jobs ?? [];
  const appFeed = recentApps ?? [];
  const multiBusiness = businesses.length > 1;
  const allSelected = selectedIds.size === businesses.length;
  const router = useRouter();

  const filteredJobs = allSelected
    ? activeJobs
    : activeJobs.filter((job) => selectedIds.has(job.business.id));

  function toggleBusiness(id: string) {
    setSelectedIds((prev) => {
      // Prevent deselecting the last business.
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
              <p>Responsiveness rating</p>
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
        <Button asChild variant="light">
          <Link href="/employer/business/new">
            <PlusIcon className="mr-1 size-4" />
            Add business
          </Link>
        </Button>

        {/* My businesses modal */}
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="light">
              <BuildingIcon className="mr-1 size-4" />
              My businesses
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="mt-5 text-xl">My businesses</DialogTitle>
            </DialogHeader>
            <div className="flex flex-col gap-2">
              {businesses.map((c) => (
                <div
                  key={c.id}
                  className="flex cursor-pointer items-center justify-between gap-3 rounded-md bg-white/70 px-4 py-3 hover:bg-white/90"
                  onClick={() => router.push(`/employer/business/${c.id}/edit`)}
                >
                  <div className="text-popover min-w-0 flex-1">
                    <p className="truncate text-lg font-medium">{c.businessName}</p>

                    <div className="flex justify-between">
                      <div>
                        {c.city}, {c.state}
                      </div>
                      <div>{pluralize(c.activeJobsCount, "active job")}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-6 lg:min-h-0 lg:flex-1 lg:grid-cols-2">
        {/* Active jobs */}
        <div className="flex flex-col lg:min-h-0">
          <div className="mb-3 flex shrink-0 items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="font-medium">
                Active jobs{" "}
                <span className="bg-primary/30 text-popover rounded-full px-2 py-1.5 text-center">
                  {filteredJobs.length}
                </span>
              </h2>

              {multiBusiness && (
                <DropdownMenu>
                  <DropdownMenuTrigger
                    asChild
                    className="from-primary/40 bg-linear-to-t via-transparent to-transparent"
                  >
                    <FilterTrigger activeCount={allSelected ? undefined : selectedIds.size}>
                      Businesses
                    </FilterTrigger>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuLabel>Filter by business</DropdownMenuLabel>
                    {businesses.map((c) => (
                      <DropdownMenuCheckboxItem
                        key={c.id}
                        checked={selectedIds.has(c.id)}
                        onCheckedChange={() => toggleBusiness(c.id)}
                        onSelect={(e) => e.preventDefault()}
                      >
                        {c.businessName}
                      </DropdownMenuCheckboxItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>

            <Link
              href="/employer/jobs"
              className="hover:text-orange text-sm transition-colors duration-100"
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
                    className="bg-primary/30 cursor-pointer rounded-sm border bg-linear-to-b from-white/60 via-transparent to-transparent p-5 shadow-md backdrop-blur-xs duration-200 hover:shadow-sm hover:backdrop-blur-sm"
                    onClick={() => router.push(`/jobs/${job.id}`)}
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <CardTitle className="text-lg">{job.title}</CardTitle>
                        <Button
                          asChild
                          size="sm"
                          variant="light"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Link href={`/employer/jobs/${job.id}/applications`}>
                            Applicants ({job._count.applications})
                          </Link>
                        </Button>
                      </div>
                      <p className="text-muted-foreground mt-0.5 text-xs">
                        {multiBusiness && <> {job.business.name}</>}
                        {" · "} {job.city}, {job.state} · ${Number(job.minHourlyRate).toFixed(0)}/hr
                      </p>
                    </div>

                    <div className="mt-3 flex justify-between">
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="light"
                          disabled={updateJob.isPending}
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();

                            updateJob.mutate({
                              id: job.id,
                              status: "PAUSED",
                            });
                          }}
                        >
                          Pause
                        </Button>
                        <Button
                          asChild
                          size="sm"
                          variant="light"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Link href={`/employer/jobs/${job.id}/edit`}>Edit</Link>
                        </Button>
                      </div>
                      <Button
                        size="sm"
                        variant="destructive"
                        disabled={updateJob.isPending}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setClosingJob({ id: job.id, title: job.title });
                        }}
                      >
                        Close listing
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* New applicants */}
        <div className="mt-1 flex flex-col lg:min-h-0">
          <h2 className="mb-4 shrink-0 font-medium">New applicants</h2>

          <div className="lg:min-h-0 lg:flex-1 lg:overflow-y-auto">
            {appFeed.length === 0 ? (
              <div className="bg-primary rounded-lg border bg-linear-to-b from-white/60 via-transparent to-transparent p-4">
                <p className="text-muted-foreground text-sm">No applicants yet.</p>
              </div>
            ) : (
              <div className="overflow-hidden rounded-md pb-4">
                {appFeed.map((app) => {
                  const name =
                    `${app.seeker.seekerProfile?.firstName ?? ""} ${app.seeker.seekerProfile?.lastName ?? ""}`.trim();
                  const subtitle = [app.job.title, multiBusiness ? app.job.business.name : null]
                    .filter(Boolean)
                    .join(" · ");

                  return (
                    <Link key={app.id} href={`/employer/jobs/${app.jobId}/applications`}>
                      <div className="bg-card/50 hover:bg-card/10 mb-3 flex cursor-pointer items-center gap-3 rounded-md p-3 transition-colors duration-100 hover:shadow-sm">
                        {/* Avatar */}
                        <div className="bg-blue-dark-3 flex size-9 shrink-0 items-center justify-center rounded-full border border-white pl-0.5">
                          <span className="text-md font-medium text-white">
                            {getInitials(name)}
                          </span>
                        </div>

                        {/* Content */}
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-lg font-medium">{name}</p>
                          <p className="truncate text-sm">{subtitle}</p>
                        </div>

                        {/* Time */}
                        <span className="shrink-0 text-sm">{timeAgo(app.createdAt)}</span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {closingJob && (
        <CloseJobModal
          jobId={closingJob.id}
          jobTitle={closingJob.title}
          open={true}
          onClose={() => setClosingJob(null)}
        />
      )}
    </div>
  );
}
