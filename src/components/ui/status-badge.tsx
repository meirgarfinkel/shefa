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
  ACTIVE: "bg-success/15 text-success border border-success/25",
  DRAFT: "bg-muted text-muted-foreground border border-border",
  PAUSED: "bg-warning/15 text-warning border border-warning/25",
  FILLED: "bg-primary/15 text-primary border border-primary/25",
  EXPIRED: "bg-destructive/15 text-destructive border border-destructive/25",
  CLOSED: "bg-destructive/15 text-destructive border border-destructive/25",
};

interface StatusBadgeProps {
  status: JobStatus;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold",
        STATUS_STYLES[status],
        className,
      )}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}
