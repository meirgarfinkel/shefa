"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeftIcon } from "lucide-react";
import { trpc } from "@/lib/trpc/provider";
import { Button } from "@/components/ui/button";
import type { ApplicationStatus } from "@/db/schema";
import { DAY_LABELS } from "@/lib/constants/labels";
import { CloseJobModal } from "@/components/close-job-modal";
import { EmployerJobCard } from "@/components/employer-job-card";

const STATUS_LABELS: Record<ApplicationStatus, string> = {
  SUBMITTED: "New",
  VIEWED: "Viewed",
  REJECTED: "Rejected",
  CLOSED: "Closed",
};

const STATUS_STYLES: Record<ApplicationStatus, string> = {
  SUBMITTED: "bg-white text-popover",
  VIEWED: "bg-white text-orange",
  REJECTED: "bg-white text-danger",
  CLOSED: "bg-blue-dark-3 text-white",
};

function AppStatusBadge({ status }: { status: string }) {
  const s = status as ApplicationStatus;
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-1 text-sm font-semibold ${STATUS_STYLES[s] ?? "bg-blue-dark-3 text-white"}`}
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
  const [closing, setClosing] = useState(false);

  const { data: job } = trpc.jobPosting.getById.useQuery({ id: jobId });
  const { data: applications, isLoading } = trpc.application.listForJob.useQuery({ jobId });

  const utils = trpc.useUtils();

  // Job-level actions on the top card mirror the employer jobs list, but reload
  // this page's single job (getById) rather than the list.
  const invalidateJob = () => void utils.jobPosting.getById.invalidate({ id: jobId });
  const updateJob = trpc.jobPosting.update.useMutation({ onSuccess: invalidateJob });
  const reopenJob = trpc.jobPosting.reopen.useMutation({ onSuccess: invalidateJob });
  const confirmFreshness = trpc.jobPosting.confirmFreshness.useMutation({
    onSuccess: invalidateJob,
  });
  const jobActionPending = updateJob.isPending || reopenJob.isPending || confirmFreshness.isPending;

  const updateStatus = trpc.application.updateStatus.useMutation({
    // Optimistic: flip the badge immediately, reconcile with the server after.
    onMutate: async ({ id, status }) => {
      await utils.application.listForJob.cancel({ jobId });
      const previous = utils.application.listForJob.getData({ jobId });
      utils.application.listForJob.setData({ jobId }, (old) =>
        old?.map((app) => (app.id === id ? { ...app, status } : app)),
      );
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) utils.application.listForJob.setData({ jobId }, ctx.previous);
    },
    onSettled: () => void utils.application.listForJob.invalidate({ jobId }),
  });
  const createConversation = trpc.conversation.create.useMutation({
    onSuccess: (conv) => router.push(`/messages/${conv.id}`),
  });

  return (
    <div className="p-5">
      <div className="mx-auto max-w-2xl">
        <Link
          href="/employer/jobs"
          className="hover:text-orange mb-3 inline-flex items-center gap-1 transition-colors duration-100"
        >
          <ArrowLeftIcon className="size-3.5" />
          My jobs
        </Link>

        {job && (
          <div className="mb-3">
            <EmployerJobCard
              job={job}
              isPending={jobActionPending}
              showApplicants={false}
              showDuplicate={false}
              onConfirmFreshness={() => confirmFreshness.mutate({ id: jobId })}
              onPause={() => updateJob.mutate({ id: jobId, status: "PAUSED" })}
              onUnpause={() => updateJob.mutate({ id: jobId, status: "ACTIVE" })}
              onReopen={() => reopenJob.mutate({ id: jobId })}
              onClose={() => setClosing(true)}
            />
          </div>
        )}

        {isLoading && <p className="text-sm">Your impact is great.</p>}

        {!isLoading && applications?.length === 0 && (
          <div className="bg-secondary/40 rounded-lg p-12 text-center">
            <p className="text-sm">No applications yet.</p>
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
                      <p className="text-sm">
                        {profile?.city}, {profile?.state}
                      </p>
                      {profile && profile.availableDays.length > 0 && (
                        <p className="text-sm">
                          Available:{" "}
                          {profile.availableDays.map((d) => DAY_LABELS[d] ?? d).join(", ")}
                        </p>
                      )}
                      {profile?.workAuthorization && <p className="text-sm">Work authorized</p>}
                    </div>
                    <AppStatusBadge status={app.status} />
                  </div>

                  {app.message && (
                    <p className="mt-3 border-t pt-3 text-sm italic">&ldquo;{app.message}&rdquo;</p>
                  )}

                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t pt-3">
                    <p className="text-sm">
                      Applied {new Date(app.createdAt).toLocaleDateString()}
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {profile && (
                        <Button
                          variant="success"
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
                      {app.status === "SUBMITTED" && (
                        <Button
                          disabled={updateStatus.isPending}
                          onClick={() =>
                            updateStatus.mutate({
                              id: app.id,
                              status: "VIEWED",
                            })
                          }
                        >
                          Mark viewed
                        </Button>
                      )}
                      {(app.status === "SUBMITTED" || app.status === "VIEWED") && (
                        <Button
                          variant="destructive"
                          disabled={updateStatus.isPending}
                          onClick={() =>
                            updateStatus.mutate({
                              id: app.id,
                              status: "REJECTED",
                            })
                          }
                        >
                          Reject
                        </Button>
                      )}
                      {/* Undo a rejection or a job-close cascade. Rejected → VIEWED,
                          closed → SUBMITTED (reconsider this applicant). */}
                      {(app.status === "REJECTED" || app.status === "CLOSED") && (
                        <Button
                          disabled={updateStatus.isPending}
                          onClick={() =>
                            updateStatus.mutate({
                              id: app.id,
                              status: app.status === "REJECTED" ? "VIEWED" : "SUBMITTED",
                            })
                          }
                        >
                          Undo
                        </Button>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {job && (
        <CloseJobModal
          jobId={jobId}
          jobTitle={job.title}
          open={closing}
          onClose={() => setClosing(false)}
        />
      )}
    </div>
  );
}
