import Link from "next/link";
import { cn } from "@/lib/utils";
import { StatusBadge } from "@/components/ui/status-badge";
import { Pill } from "@/components/ui/pill";
import type { JobStatus, JobType, WorkArrangement } from "@prisma/client";
import { Car, Clock, MapPin } from "lucide-react";

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
      <div className="bg-primary/30 hover:bg-primary/5 rounded-sm border bg-linear-to-b from-white/60 via-transparent to-transparent p-5 backdrop-blur-xs hover:shadow-lg hover:backdrop-blur-sm">
        {/* Title + company on left, pay + status on right */}
        <div className="mb-3 flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-lg font-medium">{title}</h3>
            <p className="mt-0.5 text-xs">{companyName}</p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {showStatus && <StatusBadge status={status} />}
            <Pill variant="warning">From ${minHourlyRate}/hr</Pill>
          </div>
        </div>

        {/* Meta row spread across full card width */}
        <div className="flex flex-wrap items-center gap-x-6 gap-y-1.5 text-sm">
          <span className="flex items-center gap-1.5">
            <MapPin className="text-warning size-3.5 shrink-0" />
            {city}, {state}
          </span>
          <span className="flex items-center gap-1.5">
            <Clock className="text-warning size-3.5 shrink-0" />
            {JOB_TYPE_LABELS[jobType]}
          </span>
          <span className="flex items-center gap-1.5">
            <Car className="text-warning size-3.5 shrink-0" />
            {ARRANGEMENT_LABELS[workArrangement]}
          </span>
          {applicationCount > 0 && (
            <div className="ml-auto">
              <Pill>{applicationCount} applied</Pill>
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
