import { cn } from "@/lib/utils";
import type { z } from "zod";
import { JobClosureReasonEnum, JobStatusEnum } from "@/lib/schemas/jobPosting";

type JobStatus = z.infer<typeof JobStatusEnum>;
type JobClosureReason = z.infer<typeof JobClosureReasonEnum>;

const STATUS_LABELS: Record<JobStatus, string> = {
  ACTIVE: "Active",
  PAUSED: "Paused",
  CLOSED: "Closed",
};

const STATUS_STYLES: Record<JobStatus, string> = {
  ACTIVE: "bg-success/15 text-success",
  PAUSED: "bg-warning/15 text-warning",
  CLOSED: "bg-danger/15 text-danger",
};

// Filled variants show as primary/blue; other closure reasons inherit the CLOSED danger style
const CLOSURE_LABELS: Record<JobClosureReason, string> = {
  FILLED_ON_SHEFA: "Filled",
  FILLED_ELSEWHERE: "Filled",
  HIRING_FROZEN: "Hiring Frozen",
  CANCELLED: "Cancelled",
  OTHER: "Closed",
};

const CLOSURE_STYLES: Record<JobClosureReason, string> = {
  FILLED_ON_SHEFA: "bg-primary/15 text-primary",
  FILLED_ELSEWHERE: "bg-primary/15 text-primary",
  HIRING_FROZEN: "bg-danger/15 text-danger",
  CANCELLED: "bg-danger/15 text-danger",
  OTHER: "bg-danger/15 text-danger",
};

interface StatusBadgeProps {
  status: JobStatus;
  closureReason?: JobClosureReason | null;
  className?: string;
}

export function StatusBadge({ status, closureReason, className }: StatusBadgeProps) {
  const label =
    status === "CLOSED" && closureReason ? CLOSURE_LABELS[closureReason] : STATUS_LABELS[status];
  const style =
    status === "CLOSED" && closureReason ? CLOSURE_STYLES[closureReason] : STATUS_STYLES[status];

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold",
        style,
        className,
      )}
    >
      {label}
    </span>
  );
}
