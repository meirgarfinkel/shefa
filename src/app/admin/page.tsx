"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/provider";
import { Button } from "@/components/ui/button";
import type { ReportStatus } from "@/db/schema";
import { BLOCK_FLAG_THRESHOLD } from "@/lib/constants/moderation";

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

type View = "reports" | "blocked";

export default function AdminPage() {
  const [view, setView] = useState<View>("reports");

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 md:px-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Moderation</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Reports and blocks are evidence, not automatic enforcement. Suspension is always a manual
          decision.
        </p>
      </div>

      <div className="mb-6 flex gap-1.5">
        <Button
          variant={view === "reports" ? "default" : "ghost"}
          size="sm"
          className="h-7 text-xs"
          onClick={() => setView("reports")}
        >
          Reports
        </Button>
        <Button
          variant={view === "blocked" ? "default" : "ghost"}
          size="sm"
          className="h-7 text-xs"
          onClick={() => setView("blocked")}
        >
          Most blocked
        </Button>
      </div>

      {view === "reports" ? <ReportsView /> : <MostBlockedView />}
    </div>
  );
}

function ReportsView() {
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
    <>
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
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-danger hover:bg-danger/15 h-7 text-xs"
                      disabled={busy}
                      onClick={() => {
                        setSuspension.mutate({
                          userId: r.targetId,
                          suspended: !r.target.suspended,
                        });
                        if (!r.target.suspended) {
                          updateStatus.mutate({ reportId: r.id, status: "ACTIONED" });
                        }
                      }}
                    >
                      {r.target.suspended ? "Unsuspend user" : "Suspend user"}
                    </Button>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

function MostBlockedView() {
  const utils = trpc.useUtils();
  const { data: rows, isLoading } = trpc.admin.mostBlocked.useQuery();
  const setSuspension = trpc.admin.setUserSuspension.useMutation({
    onSuccess: () => void utils.admin.mostBlocked.invalidate(),
  });

  return (
    <>
      <p className="text-muted-foreground mb-4 text-xs">
        Ranked by how many distinct people currently block each user. A{" "}
        <span className="text-danger font-semibold">flag</span> marks {BLOCK_FLAG_THRESHOLD}+ blocks
        — review before acting; blocks are noisy and not proof of abuse.
      </p>

      {isLoading && <p className="text-muted-foreground text-sm">Loading…</p>}

      {!isLoading && rows?.length === 0 && (
        <div className="bg-blue-dark-2 rounded-lg p-12 text-center">
          <p className="text-muted-foreground text-sm">No blocks recorded.</p>
        </div>
      )}

      {!isLoading && rows && rows.length > 0 && (
        <ul className="space-y-3">
          {rows.map((row) => {
            const flagged = row.blockCount >= BLOCK_FLAG_THRESHOLD;
            return (
              <li
                key={row.userId}
                className="bg-primary/30 flex flex-wrap items-center justify-between gap-2 rounded-sm border bg-linear-to-b from-white/60 via-transparent to-transparent p-4 shadow-md backdrop-blur-xs"
              >
                <div>
                  <p className="text-sm font-medium">
                    {row.user?.name ?? "—"}
                    {flagged && (
                      <span className="bg-danger/15 text-danger ml-2 rounded-full px-2 py-0.5 text-xs font-semibold">
                        flagged
                      </span>
                    )}
                    {row.suspended && (
                      <span className="text-muted-foreground ml-2 text-xs">· suspended</span>
                    )}
                  </p>
                  <p className="text-muted-foreground text-xs">
                    {row.user?.email ?? row.userId} · {row.user?.role ?? "—"}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className={`text-sm font-semibold ${flagged ? "text-danger" : "text-muted-foreground"}`}
                  >
                    {row.blockCount} block{row.blockCount === 1 ? "" : "s"}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-danger hover:bg-danger/15 h-7 text-xs"
                    disabled={setSuspension.isPending}
                    onClick={() =>
                      setSuspension.mutate({ userId: row.userId, suspended: !row.suspended })
                    }
                  >
                    {row.suspended ? "Unsuspend" : "Suspend"}
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
