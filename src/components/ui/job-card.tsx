import Link from "next/link";
import { cn } from "@/lib/utils";
import { StatusBadge } from "@/components/ui/status-badge";
import { Pill } from "@/components/ui/pill";
import type { JobStatus, JobType, WorkArrangement } from "@prisma/client";

const JOB_TYPE_LABELS: Record<JobType, string> = {
  FULL_TIME: "Full-time",
  PART_TIME: "Part-time",
  EITHER: "Full or part-time",
};

const ARRANGEMENT_LABELS: Record<WorkArrangement, string> = {
  ON_SITE: "On-site",
  REMOTE: "Remote",
  HYBRID: "Hybrid",
};

interface JobCardProps {
  id: string;
  title: string;
  city: string;
  state: string;
  jobType: JobType;
  workArrangement: WorkArrangement;
  minHourlyRate: number;
  status: JobStatus;
  companyName: string;
  href: string;
  applicationCount?: number;
  className?: string;
  showStatus?: boolean;
}

export function JobCard({
  title,
  city,
  state,
  jobType,
  workArrangement,
  minHourlyRate,
  status,
  companyName,
  href,
  applicationCount,
  className,
  showStatus,
}: JobCardProps) {
  return (
    <Link href={href} className={cn("block", className)}>
      <div className="bg-surface-1 hover:bg-surface-1/70 relative rounded-lg p-6 transition-colors duration-150">
        <div className="pointer-events-none absolute inset-0 rounded-lg bg-linear-to-b from-white/7 via-transparent to-transparent" />
        <div className="mb-3 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-text hover:text-primary truncate text-sm font-medium">{title}</h3>
            <p className="text-text-muted mt-0.5 text-xs">{companyName}</p>
          </div>
          {showStatus && <StatusBadge status={status} />}
        </div>
        <div className="text-text-muted flex flex-wrap gap-3 text-xs">
          <Pill>
            <span>
              {city}, {state}
            </span>
          </Pill>
          <Pill>
            <span>{JOB_TYPE_LABELS[jobType]}</span>
          </Pill>
          <Pill>
            <span>{ARRANGEMENT_LABELS[workArrangement]}</span>
          </Pill>
          <Pill>
            <span>From ${minHourlyRate}/hr</span>
          </Pill>
          {applicationCount !== undefined && applicationCount > 0 && (
            <Pill variant="success">
              <span>{applicationCount} applied</span>
            </Pill>
          )}
        </div>
      </div>
    </Link>
  );
}
