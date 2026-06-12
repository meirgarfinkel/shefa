"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc/provider";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardDescription, CardTitle } from "@/components/ui/card";
import type { ApplicationStatus } from "@/db/schema";
import { Pill } from "@/components/ui/pill";

const STATUS_LABELS: Record<ApplicationStatus, string> = {
  SUBMITTED: "Applied",
  VIEWED: "Viewed by employer",
  REJECTED: "Not selected",
  CLOSED: "Closed",
};

const STATUS_STYLES: Record<ApplicationStatus, string> = {
  SUBMITTED: "text-success",
  VIEWED: "text-warning",
  REJECTED: "text-danger",
  CLOSED: "text-muted-foreground",
};

function AppStatusBadge({ status }: { status: ApplicationStatus }) {
  return (
    <Pill variant="light" className={STATUS_STYLES[status]}>
      {STATUS_LABELS[status]}
    </Pill>
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

      {isLoading && <p className="text-muted-foreground text-sm">Believe in yourself.</p>}

      {!isLoading && applications?.length === 0 && (
        <div className="py-12 text-center">
          <p className="text-muted-foreground mb-4 text-sm">
            You haven&apos;t applied to any jobs yet.
          </p>
          <Button asChild variant="ghost">
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
                  <div className="flex justify-between">
                    <CardTitle>{app.job.title}</CardTitle>
                    <AppStatusBadge status={app.status} />
                  </div>
                  <CardDescription>
                    {app.job.business.name} · {app.job.city}, {app.job.state}
                  </CardDescription>
                  <CardContent>
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-muted-foreground text-xs">
                        Applied: {new Date(app.createdAt).toLocaleDateString()}
                      </p>
                      {!["REJECTED", "CLOSED"].includes(app.status) && (
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            disabled={createConversation.isPending}
                            onClick={() =>
                              createConversation.mutate({
                                targetId: app.job.employerId,
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
                      <p className="text-muted-foreground mt-2 border-t pt-2 text-xs italic">
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
