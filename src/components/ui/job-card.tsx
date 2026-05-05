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
  applicationCount: number;
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
      <div className="bg-surface-3/60 hover:bg-surface-3/70 relative overflow-hidden rounded-lg p-5 transition-colors duration-100 hover:shadow-xl">
        <div className="pointer-events-none absolute inset-0 z-0 rounded-lg bg-linear-to-b from-white/15 via-transparent to-transparent" />
        <div className="from-surface-1/50 pointer-events-none absolute inset-0 z-0 rounded-lg bg-linear-to-t via-transparent to-transparent" />
        <div className="relative z-10">
          <div className="mb-3 flex items-start justify-between gap-3 whitespace-nowrap">
            <div className="min-w-0">
              <h3 className="text-text truncate text-lg font-medium">{title}</h3>
              <p className="text-text-muted mt-0.5 text-xs">{companyName}</p>
            </div>
            {showStatus && <StatusBadge status={status} />}
            <Pill variant="success">
              <span>From ${minHourlyRate}/hr</span>
            </Pill>
          </div>
          <div>
            📍 {city}, {state}
          </div>
          <div>🕒 {JOB_TYPE_LABELS[jobType]}</div>
          <div className="flex justify-between">
            🚗 {ARRANGEMENT_LABELS[workArrangement]}
            {applicationCount > 0 && (
              <Pill>
                <span>{applicationCount} applied</span>
              </Pill>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
