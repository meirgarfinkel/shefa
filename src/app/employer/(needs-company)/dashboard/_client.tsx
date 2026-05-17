"use client";

import Link from "next/link";
import { BriefcaseIcon, MessageSquareIcon, PlusIcon } from "lucide-react";
import { trpc } from "@/lib/trpc/provider";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/ui/stat-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { PageHeader } from "@/components/ui/page-header";

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
  const { data: jobs } = trpc.jobPosting.list.useQuery({ myJobs: true, status: ["ACTIVE"] });
  const { data: recentApps } = trpc.employer.getRecentApplications.useQuery();

  const utils = trpc.useUtils();
  const updateJob = trpc.jobPosting.update.useMutation({
    onSuccess: () => void utils.jobPosting.list.invalidate(),
  });

  const activeJobs = jobs ?? [];
  const appFeed = recentApps ?? [];
  const totalActiveJobs = companies.reduce((sum, c) => sum + c.activeJobsCount, 0);
  const multiCompany = companies.length > 1;

  return (
    <div
      className="mx-auto flex max-w-6xl flex-col px-4 pt-8 pb-8"
      style={{ height: "calc(100vh - 64px)" }}
    >
      <PageHeader
        title={`Hi, ${profile.firstName}`}
        description="Manage your jobs and applicants."
      />

      {/* Quick actions */}
      <div className="mb-6 flex flex-wrap gap-2">
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
      </div>

      {/* Your Companies */}
      <div className="mb-6">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-medium">Your Companies</h2>
        </div>
        <div className="flex flex-wrap gap-3">
          {companies.map((c) => (
            <div key={c.id} className="bg-blue-dark-2 flex items-center gap-3 rounded-md px-4 py-3">
              <div>
                <p className="text-sm font-medium">{c.companyName}</p>
                <p className="text-muted-foreground text-xs">
                  {c.city}, {c.state} · {c.activeJobsCount} active job
                  {c.activeJobsCount !== 1 ? "s" : ""}
                </p>
              </div>
              <Button asChild size="sm" variant="ghost" className="h-7 text-xs">
                <Link href={`/employer/company/${c.id}/edit`}>Edit</Link>
              </Button>
            </div>
          ))}
        </div>
      </div>

      {/* Stats row */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <StatCard label="Active jobs" value={totalActiveJobs} />

        <div className="bg-primary flex items-center justify-between rounded-md border bg-linear-to-b from-white/60 via-transparent to-transparent p-4 font-medium">
          <p className="text-muted-foreground">Responsiveness</p>
          {profile.isResponsive ? (
            <span className="bg-success/15 text-success rounded-full px-2.5 py-0.5 text-xs font-semibold">
              Responsive
            </span>
          ) : (
            <p className="text-muted-foreground text-xs">
              {profile.responsivenessUpdatedAt != null ? "Not yet responsive" : "No data yet"}
            </p>
          )}
        </div>
      </div>

      {/* Two-column scrollable section */}
      <div className="grid min-h-0 flex-1 gap-6 lg:grid-cols-2">
        {/* Left — Active jobs */}
        <div className="flex min-h-0 flex-col">
          <div className="mb-3 flex shrink-0 items-center justify-between">
            <h2 className="font-medium">Active jobs</h2>
            <Link
              href="/employer/jobs"
              className="text-muted-foreground hover:text-popover-foreground text-xs transition-colors duration-100"
            >
              View all →
            </Link>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto pr-1">
            {activeJobs.length === 0 ? (
              <div className="rounded-lg p-6 text-center">
                <p className="text-muted-foreground text-sm">No active jobs.</p>
                <Button asChild className="mt-3" size="sm">
                  <Link href="/employer/jobs/new">Post your first job</Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-3 pb-4">
                {activeJobs.map((job) => (
                  <div
                    key={job.id}
                    className="bg-primary/30 hover:bg-primary/10 rounded-sm border bg-linear-to-b from-white/60 via-transparent to-transparent p-4 transition-colors duration-100"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate font-medium">{job.title}</p>
                        <StatusBadge status={job.status} />
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
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right — New applicants */}
        <div className="flex min-h-0 flex-col">
          <h2 className="mb-3 shrink-0 font-medium">New applicants</h2>

          <div className="min-h-0 flex-1 overflow-y-auto">
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
