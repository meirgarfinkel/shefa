import Link from "next/link";
import { cn } from "@/lib/utils";
import { StatusBadge } from "@/components/ui/status-badge";
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
  className?: string;
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
  className,
}: JobCardProps) {
  return (
    <Link href={href} className={cn("block", className)}>
      <div className="border-border bg-card hover:border-border/60 hover:bg-card/80 rounded-lg border p-5 transition-colors duration-150">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-foreground truncate text-sm font-medium">{title}</h3>
            <p className="text-muted-foreground mt-0.5 text-xs">{companyName}</p>
          </div>
          <StatusBadge status={status} />
        </div>
        <div className="text-muted-foreground flex flex-wrap gap-3 text-xs">
          <span>
            {city}, {state}
          </span>
          <span>{JOB_TYPE_LABELS[jobType]}</span>
          <span>{ARRANGEMENT_LABELS[workArrangement]}</span>
          <span>From ${minHourlyRate}/hr</span>
        </div>
      </div>
    </Link>
  );
}
