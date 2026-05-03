"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc/provider";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";

type ApplicationStatus = "SUBMITTED" | "VIEWED" | "RESPONDED";

const STATUS_LABELS: Record<ApplicationStatus, string> = {
  SUBMITTED: "Applied",
  VIEWED: "Viewed by employer",
  RESPONDED: "Responded",
};

const STATUS_STYLES: Record<ApplicationStatus, string> = {
  SUBMITTED: "bg-surface-3 text-text-muted border border-transprent",
  VIEWED: "bg-warning/15 text-warning border border-warning/25",
  RESPONDED: "bg-success/15 text-success border border-success/25",
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

export default function SeekerApplicationsPage() {
  const router = useRouter();
  const { data: applications, isLoading } = trpc.application.listForSeeker.useQuery();

  const createConversation = trpc.conversation.create.useMutation({
    onSuccess: (conv) => router.push(`/messages/${conv.id}`),
  });

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 md:px-8">
      <PageHeader title="My applications" description="Jobs you've applied to." />

      {isLoading && <p className="text-text-muted text-sm">Loading…</p>}

      {!isLoading && applications?.length === 0 && (
        <div className="py-12 text-center">
          <p className="text-text-muted mb-4 text-sm">You haven&apos;t applied to any jobs yet.</p>
          <Button asChild variant="ghost" className="border-transprent hover:bg-surface-3 border">
            <Link href="/jobs">Browse listings</Link>
          </Button>
        </div>
      )}

      {!isLoading && applications && applications.length > 0 && (
        <ul className="space-y-4">
          {applications.map((app) => (
            <li key={app.id} className="border-transprent bg-surface-1 rounded-lg border p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <Link href={`/jobs/${app.job.id}`} className="font-medium hover:underline">
                    {app.job.title}
                  </Link>
                  <p className="text-text-muted text-sm">
                    {app.job.employerProfile.companyName} · {app.job.city}, {app.job.state}
                  </p>
                </div>
                <AppStatusBadge status={app.status} />
              </div>

              <div className="mt-3 flex items-center justify-between gap-2">
                <p className="text-text-muted text-xs">
                  Applied {new Date(app.createdAt).toLocaleDateString()}
                </p>
                <div className="flex gap-2">
                  {app.job.status === "ACTIVE" && (
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={createConversation.isPending}
                      onClick={() =>
                        createConversation.mutate({
                          targetProfileId: app.job.employerProfile.id,
                          jobId: app.job.id,
                        })
                      }
                    >
                      Message
                    </Button>
                  )}
                </div>
              </div>

              {app.message && (
                <p className="border-transprent text-text-muted mt-2 border-t pt-2 text-xs italic">
                  &ldquo;{app.message}&rdquo;
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
