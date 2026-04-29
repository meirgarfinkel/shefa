"use client";

import { use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useEffect } from "react";
import { trpc } from "@/lib/trpc/provider";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

type ApplicationStatus = "SUBMITTED" | "VIEWED" | "RESPONDED" | "CLOSED";

const STATUS_LABELS: Record<ApplicationStatus, string> = {
  SUBMITTED: "New",
  VIEWED: "Viewed",
  RESPONDED: "Responded",
  CLOSED: "Closed",
};

const STATUS_STYLES: Record<ApplicationStatus, string> = {
  SUBMITTED: "bg-blue-100 text-blue-800",
  VIEWED: "bg-yellow-100 text-yellow-800",
  RESPONDED: "bg-green-100 text-green-800",
  CLOSED: "bg-muted text-muted-foreground",
};

const DAY_LABELS: Record<string, string> = {
  SUN: "Sun",
  MON: "Mon",
  TUE: "Tue",
  WED: "Wed",
  THU: "Thu",
  FRI: "Fri",
  SAT: "Sat",
};

function StatusBadge({ status }: { status: string }) {
  const s = status as ApplicationStatus;
  return (
    <span
      className={`rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_STYLES[s] ?? "bg-muted text-muted-foreground"}`}
    >
      {STATUS_LABELS[s] ?? s}
    </span>
  );
}

export default function EmployerJobApplicationsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: jobId } = use(params);
  const { data: session, status: authStatus } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (authStatus === "loading") return;
    if (!session || session.user.role !== "EMPLOYER") {
      router.replace("/");
    }
  }, [session, authStatus, router]);

  const { data: applications, isLoading } = trpc.application.listForJob.useQuery(
    { jobId },
    { enabled: session?.user?.role === "EMPLOYER" },
  );

  const utils = trpc.useUtils();
  const updateStatus = trpc.application.updateStatus.useMutation({
    onSuccess: () => void utils.application.listForJob.invalidate({ jobId }),
  });

  if (authStatus === "loading" || !session || session.user.role !== "EMPLOYER") {
    return null;
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <div className="mb-6 flex items-center gap-3">
        <Link href="/employer/jobs" className="text-muted-foreground hover:text-foreground text-sm">
          ← My jobs
        </Link>
      </div>

      <h1 className="mb-1 text-2xl font-semibold">Applications</h1>
      <p className="text-muted-foreground mb-6 text-sm">
        Candidates who applied to this job posting.
      </p>

      <Separator className="mb-6" />

      {isLoading && <p className="text-muted-foreground text-sm">Loading…</p>}

      {!isLoading && applications?.length === 0 && (
        <div className="py-12 text-center">
          <p className="text-muted-foreground text-sm">No applications yet.</p>
        </div>
      )}

      {!isLoading && applications && applications.length > 0 && (
        <ul className="space-y-4">
          {applications.map((app) => (
            <li key={app.id} className="rounded-lg border p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-medium">
                    {app.seekerProfile.firstName} {app.seekerProfile.lastName}
                  </p>
                  <p className="text-muted-foreground text-sm">
                    {app.seekerProfile.city}, {app.seekerProfile.state}
                  </p>
                  {app.seekerProfile.availableDays.length > 0 && (
                    <p className="text-muted-foreground text-xs">
                      Available:{" "}
                      {app.seekerProfile.availableDays.map((d) => DAY_LABELS[d] ?? d).join(", ")}
                    </p>
                  )}
                  {app.seekerProfile.workAuthorization && (
                    <p className="text-muted-foreground text-xs">Work authorized</p>
                  )}
                </div>
                <StatusBadge status={app.status} />
              </div>

              {app.message && (
                <p className="text-muted-foreground mt-3 border-t pt-3 text-sm italic">
                  &ldquo;{app.message}&rdquo;
                </p>
              )}

              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t pt-3">
                <p className="text-muted-foreground text-xs">
                  Applied {new Date(app.createdAt).toLocaleDateString()}
                </p>
                {app.status !== "CLOSED" && (
                  <div className="flex gap-2">
                    {app.status === "SUBMITTED" && (
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={updateStatus.isPending}
                        onClick={() => updateStatus.mutate({ id: app.id, status: "VIEWED" })}
                      >
                        Mark viewed
                      </Button>
                    )}
                    {(app.status === "SUBMITTED" || app.status === "VIEWED") && (
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={updateStatus.isPending}
                        onClick={() => updateStatus.mutate({ id: app.id, status: "RESPONDED" })}
                      >
                        Mark responded
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-muted-foreground text-xs"
                      disabled={updateStatus.isPending}
                      onClick={() => updateStatus.mutate({ id: app.id, status: "CLOSED" })}
                    >
                      Close
                    </Button>
                  </div>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
