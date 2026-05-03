import { cn } from "@/lib/utils";
import type { JobStatus } from "@prisma/client";

export const STATUS_LABELS: Record<JobStatus, string> = {
  DRAFT: "Draft",
  ACTIVE: "Active",
  PAUSED: "Paused",
  FILLED: "Filled",
  EXPIRED: "Expired",
  CLOSED: "Closed",
};

const STATUS_STYLES: Record<JobStatus, string> = {
  ACTIVE: "bg-success/15 text-success",
  DRAFT: "bg-surface-3 text-text-muted",
  PAUSED: "bg-warning/15 text-warning",
  FILLED: "bg-primary/15 text-primary",
  EXPIRED: "bg-danger/15 text-danger",
  CLOSED: "bg-danger/15 text-danger",
};

interface StatusBadgeProps {
  status: JobStatus;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold",
        STATUS_STYLES[status],
        className,
      )}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}
