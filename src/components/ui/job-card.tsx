import { cn } from "@/lib/utils";
import { countryConfig } from "@/lib/constants/countries";
import { Pill } from "@/components/ui/pill";
import type { JobType, WorkArrangement } from "@/db/schema";
import type { z } from "zod";
import { JobStatusEnum } from "@/lib/schemas/jobPosting";

type JobStatus = z.infer<typeof JobStatusEnum>;
import { Car, Clock, MapPin } from "lucide-react";
import { JOB_TYPE_LABELS, ARRANGEMENT_LABELS } from "@/lib/constants/labels";
import { Panel } from "./panel";
import { useRouter } from "next/navigation";

interface JobCardProps {
  id: string;
  title: string;
  country: string;
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
  /** Called synchronously before navigating, e.g. to persist scroll position. */
  onNavigate?: () => void;
}

export function JobCard({
  title,
  country,
  city,
  state,
  jobType,
  workArrangement,
  minHourlyRate,
  businessName,
  href,
  applicationCount,
  className,
  onNavigate,
}: JobCardProps) {
  const router = useRouter();
  return (
    <Panel
      className={cn(
        "bg-primary/10 glass-hover relative cursor-pointer shadow-[-2px_3px_6px_#00000033,inset_10px_-10px_8px_#ffffff66,inset_-10px_10px_8px_#ffffff]",
        className,
      )}
      onClick={() => {
        onNavigate?.();
        router.push(`${href}`);
      }}
    >
      <div className="mb-3 flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-lg font-medium capitalize">{title}</h3>
          <p className="mt-0.5 text-xs">{businessName}</p>
        </div>
        {applicationCount > 0 && <Pill size="sm">{applicationCount} Applied</Pill>}
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
        <span className="flex items-center gap-1.5">
          <span className="text-orange shrink-0 text-sm font-medium">
            {countryConfig(country).currencySymbol}
          </span>
          {minHourlyRate}+ (hourly)
        </span>
      </div>
    </Panel>
  );
}
