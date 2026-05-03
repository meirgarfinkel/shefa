"use client";

import { use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc/provider";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";

type ApplicationStatus = "SUBMITTED" | "VIEWED" | "RESPONDED" | "CLOSED";

const STATUS_LABELS: Record<ApplicationStatus, string> = {
  SUBMITTED: "New",
  VIEWED: "Viewed",
  RESPONDED: "Responded",
  CLOSED: "Closed",
};

const STATUS_STYLES: Record<ApplicationStatus, string> = {
  SUBMITTED: "bg-surface-3 text-text-muted border border-transprent",
  VIEWED: "bg-warning/15 text-warning border border-warning/25",
  RESPONDED: "bg-success/15 text-success border border-success/25",
  CLOSED: "bg-danger/15 text-danger border border-danger/25",
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

function AppStatusBadge({ status }: { status: string }) {
  const s = status as ApplicationStatus;
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_STYLES[s] ?? "bg-surface-3 text-text-muted border-transprent border"}`}
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
  const router = useRouter();

  const { data: applications, isLoading } = trpc.application.listForJob.useQuery({ jobId });

  const utils = trpc.useUtils();
  const updateStatus = trpc.application.updateStatus.useMutation({
    onSuccess: () => void utils.application.listForJob.invalidate({ jobId }),
  });

  const createConversation = trpc.conversation.create.useMutation({
    onSuccess: (conv) => router.push(`/messages/${conv.id}`),
  });

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 md:px-8">
      <div className="mb-4">
        <Link href="/employer/jobs" className="text-text-muted hover:text-text text-sm">
          ← My jobs
        </Link>
      </div>

      <PageHeader title="Applications" description="Candidates who applied to this job posting." />

      {isLoading && <p className="text-text-muted text-sm">Loading…</p>}

      {!isLoading && applications?.length === 0 && (
        <div className="py-12 text-center">
          <p className="text-text-muted text-sm">No applications yet.</p>
        </div>
      )}

      {!isLoading && applications && applications.length > 0 && (
        <ul className="space-y-4">
          {applications.map((app) => (
            <li key={app.id} className="border-transprent bg-surface-1 rounded-lg border p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-medium">
                    {app.seekerProfile.firstName} {app.seekerProfile.lastName}
                  </p>
                  <p className="text-text-muted text-sm">
                    {app.seekerProfile.city}, {app.seekerProfile.state}
                  </p>
                  {app.seekerProfile.availableDays.length > 0 && (
                    <p className="text-text-muted text-xs">
                      Available:{" "}
                      {app.seekerProfile.availableDays.map((d) => DAY_LABELS[d] ?? d).join(", ")}
                    </p>
                  )}
                  {app.seekerProfile.workAuthorization && (
                    <p className="text-text-muted text-xs">Work authorized</p>
                  )}
                </div>
                <AppStatusBadge status={app.status} />
              </div>

              {app.message && (
                <p className="border-transprent text-text-muted mt-3 border-t pt-3 text-sm italic">
                  &ldquo;{app.message}&rdquo;
                </p>
              )}

              <div className="border-transprent mt-3 flex flex-wrap items-center justify-between gap-2 border-t pt-3">
                <p className="text-text-muted text-xs">
                  Applied {new Date(app.createdAt).toLocaleDateString()}
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={createConversation.isPending}
                    onClick={() =>
                      createConversation.mutate({
                        targetProfileId: app.seekerProfile.id,
                        jobId,
                      })
                    }
                  >
                    Message
                  </Button>
                  {app.status !== "CLOSED" && (
                    <>
                      {app.status === "SUBMITTED" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={updateStatus.isPending}
                          onClick={() => updateStatus.mutate({ id: app.id, status: "VIEWED" })}
                        >
                          Mark viewed
                        </Button>
                      )}
                      {(app.status === "SUBMITTED" || app.status === "VIEWED") && (
                        <Button
                          variant="ghost"
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
                        className="text-text-muted text-xs"
                        disabled={updateStatus.isPending}
                        onClick={() => updateStatus.mutate({ id: app.id, status: "CLOSED" })}
                      >
                        Close
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
