import Link from "next/link";
import { cn } from "@/lib/utils";
import { Pill } from "@/components/ui/pill";
import type { JobType, WorkArrangement } from "@/db/schema";
import type { z } from "zod";
import { JobStatusEnum } from "@/lib/schemas/jobPosting";

type JobStatus = z.infer<typeof JobStatusEnum>;
import { Car, Clock, MapPin, DollarSign } from "lucide-react";
import { JOB_TYPE_LABELS, ARRANGEMENT_LABELS } from "@/lib/constants/labels";

interface JobCardProps {
  id: string;
  title: string;
  city: string;
  state: string;
  jobType: JobType;
  workArrangement: WorkArrangement;
  minHourlyRate: number;
  status: JobStatus;
  businessName: string;
  href: string;
  applicationCount: number;
  className?: string;
}

export function JobCard({
  title,
  city,
  state,
  jobType,
  workArrangement,
  minHourlyRate,
  businessName,
  href,
  applicationCount,
  className,
}: JobCardProps) {
  return (
    <Link href={href} className={cn("block", className)}>
      <div className="bg-primary/30 hover:bg-primary/5 rounded-sm border bg-linear-to-b from-white/60 via-transparent to-transparent p-5 shadow-md backdrop-blur-xs duration-200 hover:shadow-sm hover:backdrop-blur-sm">
        <div className="mb-3 flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-lg font-medium capitalize">{title}</h3>
            <p className="mt-0.5 text-xs">{businessName}</p>
          </div>
          {applicationCount > 0 && <Pill>{applicationCount} Applied</Pill>}
        </div>

        {/* Meta row spread across full card width */}
        <div className="flex flex-wrap items-center gap-x-6 gap-y-1.5 text-sm">
          <span className="flex items-center gap-1.5">
            <MapPin className="text-orange size-3.5 shrink-0" />
            {city}, {state}
          </span>
          <span className="flex items-center gap-1.5">
            <Clock className="text-orange size-3.5 shrink-0" />
            {JOB_TYPE_LABELS[jobType]}
          </span>
          <span className="flex items-center gap-1.5">
            <Car className="text-orange size-4 shrink-0" />
            {ARRANGEMENT_LABELS[workArrangement]}
          </span>
          <span className="flex items-center">
            <DollarSign className="text-orange size-3.5 shrink-0" />
            {minHourlyRate}+ (hourly)
          </span>
        </div>
      </div>
    </Link>
  );
}
