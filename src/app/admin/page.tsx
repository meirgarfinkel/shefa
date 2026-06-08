"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/provider";
import { Button } from "@/components/ui/button";
import type { ReportStatus } from "@/db/schema";

const STATUS_FILTERS: { value: ReportStatus | "ALL"; label: string }[] = [
  { value: "OPEN", label: "Open" },
  { value: "REVIEWED", label: "Reviewed" },
  { value: "ACTIONED", label: "Actioned" },
  { value: "DISMISSED", label: "Dismissed" },
  { value: "ALL", label: "All" },
];

const TARGET_LABEL: Record<string, string> = {
  USER: "User",
  JOB: "Job",
  MESSAGE: "Message",
};

export default function AdminReportsPage() {
  const [filter, setFilter] = useState<ReportStatus | "ALL">("OPEN");

  const utils = trpc.useUtils();
  const { data: reports, isLoading } = trpc.admin.listReports.useQuery(
    filter === "ALL" ? {} : { status: filter },
  );

  const invalidate = () => void utils.admin.listReports.invalidate();
  const updateStatus = trpc.admin.updateReportStatus.useMutation({ onSuccess: invalidate });
  const setSuspension = trpc.admin.setUserSuspension.useMutation({ onSuccess: invalidate });

  const busy = updateStatus.isPending || setSuspension.isPending;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 md:px-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Moderation</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Reports are evidence, not automatic enforcement. Review and act explicitly.
        </p>
      </div>

      <div className="mb-6 flex flex-wrap gap-1.5">
        {STATUS_FILTERS.map((f) => (
          <Button
            key={f.value}
            variant={filter === f.value ? "default" : "ghost"}
            size="sm"
            className="h-7 text-xs"
            onClick={() => setFilter(f.value)}
          >
            {f.label}
          </Button>
        ))}
      </div>

      {isLoading && <p className="text-muted-foreground text-sm">Loading…</p>}

      {!isLoading && reports?.length === 0 && (
        <div className="bg-blue-dark-2 rounded-lg p-12 text-center">
          <p className="text-muted-foreground text-sm">No reports in this view.</p>
        </div>
      )}

      {!isLoading && reports && reports.length > 0 && (
        <ul className="space-y-4">
          {reports.map((r) => (
            <li
              key={r.id}
              className="bg-primary/30 rounded-sm border bg-linear-to-b from-white/60 via-transparent to-transparent p-5 shadow-md backdrop-blur-xs"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="text-xs font-semibold tracking-wide uppercase">
                    {TARGET_LABEL[r.targetType] ?? r.targetType}
                    {r.target.type === "USER" && r.target.suspended && (
                      <span className="text-danger ml-2 normal-case">· suspended</span>
                    )}
                  </p>
                  <div className="text-muted-foreground mt-1 text-sm">
                    {r.target.type === "USER" && r.target.user && (
                      <span>
                        {r.target.user.name ?? "—"} ({r.target.user.email})
                      </span>
                    )}
                    {r.target.type === "JOB" && r.target.job && (
                      <span>
                        {r.target.job.title} · {r.target.job.status}
                      </span>
                    )}
                    {r.target.type === "MESSAGE" && r.target.message && (
                      <span className="italic">&ldquo;{r.target.message.body}&rdquo;</span>
                    )}
                    {((r.target.type === "USER" && !r.target.user) ||
                      (r.target.type === "JOB" && !r.target.job) ||
                      (r.target.type === "MESSAGE" && !r.target.message)) && (
                      <span className="italic">target no longer exists</span>
                    )}
                  </div>
                </div>
                <span className="bg-blue-dark-3 text-muted-foreground inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold">
                  {r.status}
                </span>
              </div>

              <p className="mt-3 border-t pt-3 text-sm">{r.reason}</p>

              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t pt-3">
                <p className="text-muted-foreground text-xs">
                  Reported {new Date(r.createdAt).toLocaleDateString()}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {r.status !== "REVIEWED" && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs"
                      disabled={busy}
                      onClick={() => updateStatus.mutate({ reportId: r.id, status: "REVIEWED" })}
                    >
                      Mark reviewed
                    </Button>
                  )}
                  {r.status !== "DISMISSED" && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-muted-foreground hover:bg-blue-dark-3 h-7 text-xs"
                      disabled={busy}
                      onClick={() => updateStatus.mutate({ reportId: r.id, status: "DISMISSED" })}
                    >
                      Dismiss
                    </Button>
                  )}
                  {r.target.type === "USER" && r.target.user && (
                    <>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-danger hover:bg-danger/15 h-7 text-xs"
                        disabled={busy}
                        onClick={() => {
                          setSuspension.mutate({
                            userId: r.target.type === "USER" ? r.targetId : "",
                            suspended: !r.target.suspended,
                          });
                          if (!r.target.suspended) {
                            updateStatus.mutate({ reportId: r.id, status: "ACTIONED" });
                          }
                        }}
                      >
                        {r.target.suspended ? "Unsuspend user" : "Suspend user"}
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
