"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useEffect } from "react";
import { trpc } from "@/lib/trpc/provider";
import { Button } from "@/components/ui/button";

type JobStatus = "DRAFT" | "ACTIVE" | "PAUSED" | "FILLED" | "EXPIRED" | "CLOSED";

const STATUS_STYLES: Record<JobStatus, string> = {
  DRAFT: "bg-muted text-muted-foreground",
  ACTIVE: "bg-green-100 text-green-800",
  PAUSED: "bg-yellow-100 text-yellow-800",
  FILLED: "bg-blue-100 text-blue-800",
  EXPIRED: "bg-orange-100 text-orange-800",
  CLOSED: "bg-muted text-muted-foreground line-through",
};

const STATUS_LABELS: Record<JobStatus, string> = {
  DRAFT: "Draft",
  ACTIVE: "Active",
  PAUSED: "Paused",
  FILLED: "Filled",
  EXPIRED: "Expired",
  CLOSED: "Closed",
};

function StatusBadge({ status }: { status: string }) {
  const s = status as JobStatus;
  return (
    <span
      className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLES[s] ?? "bg-muted text-muted-foreground"}`}
    >
      {STATUS_LABELS[s] ?? status}
    </span>
  );
}

export default function EmployerJobsPage() {
  const router = useRouter();
  const { data: session, status } = useSession();

  useEffect(() => {
    if (status === "unauthenticated") router.replace("/sign-in");
    else if (status === "authenticated" && session?.user?.role !== "EMPLOYER") router.replace("/");
  }, [status, session, router]);

  const { data: profile, isLoading: profileLoading } = trpc.employer.getProfile.useQuery(
    undefined,
    { enabled: status === "authenticated" && session?.user?.role === "EMPLOYER" },
  );

  const { data: jobs, isLoading: jobsLoading } = trpc.jobPosting.list.useQuery(
    { employerProfileId: profile?.id },
    { enabled: !!profile?.id },
  );

  if (status === "loading" || status === "unauthenticated") return null;
  if (session?.user?.role !== "EMPLOYER") return null;

  if (!profileLoading && !profile) {
    router.replace("/employer/profile/new");
    return null;
  }

  const isLoading = profileLoading || jobsLoading;

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Your job postings</h1>
          {profile && <p className="text-muted-foreground mt-1 text-sm">{profile.companyName}</p>}
        </div>
        <Button asChild>
          <Link href="/employer/jobs/new">Post a job</Link>
        </Button>
      </div>

      {isLoading && <div className="text-muted-foreground py-16 text-center text-sm">Loading…</div>}

      {!isLoading && jobs?.length === 0 && (
        <div className="text-muted-foreground rounded-lg border py-16 text-center text-sm">
          No job postings yet.{" "}
          <Link href="/employer/jobs/new" className="text-foreground underline underline-offset-2">
            Post your first job.
          </Link>
        </div>
      )}

      {!isLoading && jobs && jobs.length > 0 && (
        <div className="divide-y rounded-lg border">
          {jobs.map((job) => (
            <div key={job.id} className="flex items-center gap-4 px-4 py-3">
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
