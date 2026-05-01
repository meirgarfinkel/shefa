"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc/provider";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { PageHeader } from "@/components/ui/page-header";

export default function EmployerJobsPage() {
  const router = useRouter();

  const { data: profile, isLoading: profileLoading } = trpc.employer.getProfile.useQuery();

  const { data: jobs, isLoading: jobsLoading } = trpc.jobPosting.list.useQuery(
    { employerProfileId: profile?.id },
    { enabled: !!profile?.id },
  );

  if (!profileLoading && !profile) {
    router.replace("/employer/profile/new");
    return null;
  }

  const isLoading = profileLoading || jobsLoading;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 md:px-8">
      <PageHeader
        title="Your job postings"
        description={profile?.companyName}
        actions={
          <Button
            asChild
            className="border-primary/40 bg-primary/15 text-primary hover:bg-primary/25 border transition-colors duration-150"
          >
            <Link href="/employer/jobs/new">Post a job</Link>
          </Button>
        }
      />

      {isLoading && <div className="text-muted-foreground py-16 text-center text-sm">Loading…</div>}

      {!isLoading && jobs?.length === 0 && (
        <div className="border-border bg-card text-muted-foreground rounded-lg border py-16 text-center text-sm">
          No job postings yet.{" "}
          <Link href="/employer/jobs/new" className="text-foreground underline underline-offset-2">
            Post your first job.
          </Link>
        </div>
      )}

      {!isLoading && jobs && jobs.length > 0 && (
        <div className="border-border bg-card overflow-hidden rounded-lg border">
          {jobs.map((job, i) => (
            <div
              key={job.id}
              className={`flex items-center gap-4 px-4 py-3 ${
                i < jobs.length - 1 ? "border-border border-b" : ""
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
