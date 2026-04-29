"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useEffect } from "react";
import { trpc } from "@/lib/trpc/provider";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

type ApplicationStatus = "SUBMITTED" | "VIEWED" | "RESPONDED" | "CLOSED";

const STATUS_LABELS: Record<ApplicationStatus, string> = {
  SUBMITTED: "Applied",
  VIEWED: "Viewed by employer",
  RESPONDED: "Responded",
  CLOSED: "Withdrawn",
};

const STATUS_STYLES: Record<ApplicationStatus, string> = {
  SUBMITTED: "bg-blue-100 text-blue-800",
  VIEWED: "bg-yellow-100 text-yellow-800",
  RESPONDED: "bg-green-100 text-green-800",
  CLOSED: "bg-muted text-muted-foreground",
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

export default function SeekerApplicationsPage() {
  const { data: session, status: authStatus } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (authStatus === "loading") return;
    if (!session || session.user.role !== "SEEKER") {
      router.replace("/");
    }
  }, [session, authStatus, router]);

  const { data: applications, isLoading } = trpc.application.listForSeeker.useQuery(undefined, {
    enabled: session?.user?.role === "SEEKER",
  });

  const utils = trpc.useUtils();
  const withdraw = trpc.application.withdraw.useMutation({
    onSuccess: () => void utils.application.listForSeeker.invalidate(),
  });

  if (authStatus === "loading" || !session || session.user.role !== "SEEKER") {
    return null;
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="mb-1 text-2xl font-semibold">My applications</h1>
      <p className="text-muted-foreground mb-6 text-sm">Jobs you&apos;ve applied to.</p>

      <Separator className="mb-6" />

      {isLoading && <p className="text-muted-foreground text-sm">Loading…</p>}

      {!isLoading && applications?.length === 0 && (
        <div className="py-12 text-center">
          <p className="text-muted-foreground mb-4 text-sm">
            You haven&apos;t applied to any jobs yet.
          </p>
          <Button asChild variant="outline">
            <Link href="/jobs">Browse listings</Link>
          </Button>
        </div>
      )}

      {!isLoading && applications && applications.length > 0 && (
        <ul className="space-y-4">
          {applications.map((app) => (
            <li key={app.id} className="rounded-lg border p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <Link href={`/jobs/${app.job.id}`} className="font-medium hover:underline">
                    {app.job.title}
                  </Link>
                  <p className="text-muted-foreground text-sm">
                    {app.job.employerProfile.companyName} · {app.job.city}, {app.job.state}
                  </p>
                </div>
                <StatusBadge status={app.status} />
              </div>

              <div className="mt-3 flex items-center justify-between gap-2">
                <p className="text-muted-foreground text-xs">
                  Applied {new Date(app.createdAt).toLocaleDateString()}
                </p>
                {app.status === "SUBMITTED" && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground h-auto py-1 text-xs"
                    disabled={withdraw.isPending}
                    onClick={() => withdraw.mutate({ id: app.id })}
                  >
                    Withdraw
                  </Button>
                )}
              </div>

              {app.message && (
                <p className="text-muted-foreground mt-2 border-t pt-2 text-xs italic">
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
