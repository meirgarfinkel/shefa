"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc/provider";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardDescription, CardTitle } from "@/components/ui/card";

type ApplicationStatus = "SUBMITTED" | "VIEWED" | "RESPONDED" | "CLOSED";

const STATUS_LABELS: Record<ApplicationStatus, string> = {
  SUBMITTED: "Applied",
  VIEWED: "Viewed by employer",
  RESPONDED: "Responded",
  CLOSED: "Closed",
};

const STATUS_STYLES: Record<ApplicationStatus, string> = {
  SUBMITTED: "bg-surface-3 text-success",
  VIEWED: "bg-secondary text-success",
  RESPONDED: "bg-secondary text-text",
  CLOSED: "bg-surface-3 text-danger",
};

function AppStatusBadge({ status }: { status: string }) {
  const s = status as ApplicationStatus;
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_STYLES[s] ?? "bg-surface-3 text-text-muted"}`}
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
          <Button asChild variant="ghost" className="hover:bg-surface-3">
            <Link href="/jobs">Browse listings</Link>
          </Button>
        </div>
      )}

      {!isLoading && applications && applications.length > 0 && (
        <ul className="space-y-5">
          {applications.map((app) => (
            <li key={app.id}>
              <Link href={`/jobs/${app.job.id}`}>
                <Card>
                  <CardTitle className="flex justify-between">
                    {app.job.title}
                    <AppStatusBadge status={app.status} />
                  </CardTitle>
                  <CardDescription>
                    {app.job.employerProfile.companyName} · {app.job.city}, {app.job.state}
                  </CardDescription>
                  <CardContent>
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-text-muted text-xs">
                        Applied: {new Date(app.createdAt).toLocaleDateString()}
                      </p>
                      {app.job.status === "ACTIVE" && (
                        <div className="flex gap-2">
                          <Button
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
                        </div>
                      )}
                    </div>
                    {app.message && (
                      <p className="text-text-muted mt-2 border-t pt-2 text-xs italic">
                        Message: &ldquo;{app.message}&rdquo;
                      </p>
                    )}
                  </CardContent>
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
