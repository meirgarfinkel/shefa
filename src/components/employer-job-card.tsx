"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { z } from "zod";
import { Button } from "@/components/ui/button";
import { CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import type { JobStatus } from "@/db/schema";
import type { JobClosureReasonEnum } from "@/lib/schemas/jobPosting";
import { cn } from "@/lib/utils";

type JobClosureReason = z.infer<typeof JobClosureReasonEnum>;

const FRESHNESS_DAYS = 7;

/** Minimal shape both `jobPosting.list` items and `jobPosting.getById` satisfy. */
export type EmployerJobCardJob = {
  id: string;
  title: string;
  status: JobStatus;
  city: string;
  state: string;
  minHourlyRate: string | number;
  lastVerifiedAt: string | Date;
  closureReason?: JobClosureReason | null;
  business: { name: string };
};

export function EmployerJobCard({
  job,
  multiBusiness = false,
  isPending = false,
  showApplicants = true,
  showDuplicate = true,
  applicationsCount = 0,
  onConfirmFreshness,
  onPause,
  onUnpause,
  onReopen,
  onDuplicate,
  onClose,
}: {
  job: EmployerJobCardJob;
  multiBusiness?: boolean;
  isPending?: boolean;
  /** Hide the Applicants button (e.g. when already on the applicants page). */
  showApplicants?: boolean;
  /** Hide the Duplicate button. */
  showDuplicate?: boolean;
  applicationsCount?: number;
  onConfirmFreshness: () => void;
  onPause: () => void;
  onUnpause: () => void;
  onReopen: () => void;
  onDuplicate?: () => void;
  onClose: () => void;
}) {
  const router = useRouter();

  const isClosed = job.status === "CLOSED";
  const isActive = job.status === "ACTIVE";
  const daysSinceVerified = Math.floor(
    (Date.now() - new Date(job.lastVerifiedAt).getTime()) / (1000 * 60 * 60 * 24),
  );
  const showFreshnessBanner = isActive && daysSinceVerified >= FRESHNESS_DAYS;
  const daysUntilAutoPause = isActive ? Math.max(0, 28 - daysSinceVerified) : null;

  // Stop a control's click from bubbling to the card's navigation handler.
  const halt = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  return (
    <div
      className="bg-primary/30 relative cursor-pointer rounded-sm border bg-linear-to-b from-white/60 via-transparent to-transparent p-5 shadow-md backdrop-blur-xs duration-200 hover:shadow-sm hover:backdrop-blur-sm"
      onClick={() => router.push(`/jobs/${job.id}`)}
    >
      <div className="space-y-2 md:flex md:items-start md:justify-between md:space-y-0">
        {/* Mobile: title + status on same row */}
        <div className="flex items-start justify-between gap-3 md:block">
          <CardTitle className="min-w-0 text-lg md:text-xl">{job.title}</CardTitle>

          <div className="shrink-0 md:hidden">
            <StatusBadge status={job.status} closureReason={job.closureReason} />
          </div>
        </div>

        {/* Freshness banner */}
        {showFreshnessBanner && (
          <div className="flex items-center gap-2 md:mx-auto md:gap-3">
            <Button
              size="sm"
              variant="light"
              className="text-success w-fit"
              disabled={isPending}
              onClick={(e) => {
                halt(e);
                onConfirmFreshness();
              }}
            >
              I confirm job is still open
            </Button>

            {daysUntilAutoPause !== null && (
              <span
                className={cn(
                  "text-xs md:text-sm",
                  daysUntilAutoPause <= 7
                    ? "text-danger"
                    : daysUntilAutoPause <= 14
                      ? "text-orange"
                      : "text-muted-foreground",
                )}
              >
                auto-pauses in {daysUntilAutoPause}d
              </span>
            )}
          </div>
        )}

        {/* Desktop status badge */}
        <div className="hidden md:block">
          <StatusBadge status={job.status} closureReason={job.closureReason} />
        </div>
      </div>

      <p className="relative z-10 mt-0.5 text-xs">
        {multiBusiness && (
          <>
            {job.business.name}
            {" · "}
          </>
        )}{" "}
        {job.city}, {job.state} · ${Number(job.minHourlyRate).toFixed(0)}/hr
      </p>

      <div className="relative z-10 mt-3 flex flex-wrap justify-between">
        <div className="flex gap-1.5">
          {showApplicants && !isClosed && (
            <Button
              asChild
              variant="light"
              size="sm"
              className="h-7 text-xs"
              onClick={(e) => e.stopPropagation()}
            >
              <Link href={`/employer/jobs/${job.id}/applications`}>
                Applicants ({applicationsCount})
              </Link>
            </Button>
          )}
          {!isClosed && (
            <Button
              asChild
              variant="light"
              size="sm"
              className="h-7 text-xs"
              onClick={(e) => e.stopPropagation()}
            >
              <Link href={`/employer/jobs/${job.id}/edit`}>Edit</Link>
            </Button>
          )}
          {isActive && (
            <Button
              variant="light"
              size="sm"
              className="h-7 text-xs"
              disabled={isPending}
              onClick={(e) => {
                halt(e);
                onPause();
              }}
            >
              Pause
            </Button>
          )}
          {job.status === "PAUSED" && (
            <Button
              variant="light"
              size="sm"
              className="h-7 text-xs"
              disabled={isPending}
              onClick={(e) => {
                halt(e);
                onUnpause();
              }}
            >
              Unpause
            </Button>
          )}
          {isClosed && (
            <Button
              variant="light"
              size="sm"
              className="h-7 text-xs"
              disabled={isPending}
              onClick={(e) => {
                halt(e);
                onReopen();
              }}
            >
              Reopen
            </Button>
          )}
          {showDuplicate && (
            <Button
              variant="light"
              size="sm"
              className="h-7 text-xs"
              disabled={isPending}
              onClick={(e) => {
                halt(e);
                onDuplicate?.();
              }}
            >
              Duplicate
            </Button>
          )}
        </div>
        <div>
          {!isClosed && (
            <Button
              variant="destructive"
              size="sm"
              disabled={isPending}
              onClick={(e) => {
                halt(e);
                onClose();
              }}
            >
              Close listing
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
