"use client";

import { use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeftIcon } from "lucide-react";
import { trpc } from "@/lib/trpc/provider";
import { Button } from "@/components/ui/button";
import { ApplicationStatus } from "@prisma/client";

const STATUS_LABELS: Record<ApplicationStatus, string> = {
  SUBMITTED: "New",
  VIEWED: "Viewed",
  REJECTED: "Rejected",
  CLOSED: "Closed",
};

const STATUS_STYLES: Record<ApplicationStatus, string> = {
  SUBMITTED: "bg-primary/15 text-primary",
  VIEWED: "bg-warning/15 text-warning",
  REJECTED: "bg-danger/15 text-danger",
  CLOSED: "bg-blue-dark-3 text-muted-foreground",
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
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_STYLES[s] ?? "bg-blue-dark-3 text-muted-foreground"}`}
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

  const { data: job } = trpc.jobPosting.getById.useQuery({ id: jobId });
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
      <Link
        href="/employer/jobs"
        className="text-muted-foreground hover:text-popover-foreground mb-6 inline-flex items-center gap-1 text-sm transition-colors duration-100"
      >
        <ArrowLeftIcon className="size-3.5" />
        My jobs
      </Link>

      <div className="mb-8">
        <h1 className="text-2xl font-bold">{job?.title ?? "Applications"}</h1>
        {job && (
          <p className="text-muted-foreground mt-1 text-sm">
            {job.city}, {job.state} · {applications?.length ?? 0} applicant
            {(applications?.length ?? 0) !== 1 ? "s" : ""}
          </p>
        )}
      </div>

      {isLoading && <p className="text-muted-foreground text-sm">Loading…</p>}

      {!isLoading && applications?.length === 0 && (
        <div className="bg-blue-dark-2 rounded-lg p-12 text-center">
          <p className="text-muted-foreground text-sm">No applications yet.</p>
        </div>
      )}

      {!isLoading && applications && applications.length > 0 && (
        <ul className="space-y-4">
          {applications.map((app) => {
            const profile = app.seeker.seekerProfile;
            return (
              <li
                key={app.id}
                className="bg-primary/30 hover:bg-primary/5 rounded-sm border bg-linear-to-b from-white/60 via-transparent to-transparent p-5 shadow-md backdrop-blur-xs duration-200 hover:shadow-sm hover:backdrop-blur-sm"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-medium">
                      {profile?.firstName} {profile?.lastName}
                    </p>
                    <p className="text-muted-foreground text-sm">
                      {profile?.city}, {profile?.state}
                    </p>
                    {profile && profile.availableDays.length > 0 && (
                      <p className="text-muted-foreground text-xs">
                        Available: {profile.availableDays.map((d) => DAY_LABELS[d] ?? d).join(", ")}
                      </p>
                    )}
                    {profile?.workAuthorization && (
                      <p className="text-muted-foreground text-xs">Work authorized</p>
                    )}
                  </div>
                  <AppStatusBadge status={app.status} />
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
                  <div className="flex flex-wrap gap-1.5">
                    {profile && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs"
                        disabled={createConversation.isPending}
                        onClick={() =>
                          createConversation.mutate({
                            targetId: profile.id,
                            jobId,
                          })
                        }
                      >
                        Message
                      </Button>
                    )}
                    {app.status !== ApplicationStatus.CLOSED &&
                      app.status !== ApplicationStatus.REJECTED && (
                        <>
                          {app.status === ApplicationStatus.SUBMITTED && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 text-xs"
                              disabled={updateStatus.isPending}
                              onClick={() =>
                                updateStatus.mutate({
                                  id: app.id,
                                  status: ApplicationStatus.VIEWED,
                                })
                              }
                            >
                              Mark viewed
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-danger hover:bg-danger/15 h-7 text-xs transition-colors duration-100"
                            disabled={updateStatus.isPending}
                            onClick={() =>
                              updateStatus.mutate({
                                id: app.id,
                                status: ApplicationStatus.REJECTED,
                              })
                            }
                          >
                            Reject
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-muted-foreground hover:bg-blue-dark-3 h-7 text-xs transition-colors duration-100"
                            disabled={updateStatus.isPending}
                            onClick={() =>
                              updateStatus.mutate({
                                id: app.id,
                                status: ApplicationStatus.CLOSED,
                              })
                            }
                          >
                            Close
                          </Button>
                        </>
                      )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
