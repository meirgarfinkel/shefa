import Link from "next/link";
import { Building, Car, Check, Clock, Info, MapPin, SearchCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";
import { CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Pill } from "@/components/ui/pill";
import { ResponsiveBadge } from "@/components/ui/responsive-badge";
import type { JobStatus } from "@/db/schema";
import { JOB_TYPE_LABELS, ARRANGEMENT_LABELS, DAY_LABELS, DAY_ORDER } from "@/lib/constants/labels";

export type ConvJob = {
  id: string;
  title: string;
  status: JobStatus;
  city: string;
  state: string;
  jobType: string;
  workArrangement: string;
  workAuthRequired: boolean;
  minHourlyRate: string | number | { toString(): string };
  payNotes: string | null;
  workDays: string[];
  scheduleNotes: string | null;
  description: string;
  whatWereLookingFor: string | null;
  company: {
    id: string;
    name: string;
    employer: { isResponsive: boolean; isNew: boolean };
  };
  requiredLanguages: { language: { name: string } }[];
};

export function JobDetailCard({ job }: { job: ConvJob }) {
  const sortedDays = [...job.workDays].sort((a, b) => DAY_ORDER.indexOf(a) - DAY_ORDER.indexOf(b));

  return (
    <Panel>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <CardTitle>{job.title}</CardTitle>
        <ResponsiveBadge
          isResponsive={job.company.employer.isResponsive}
          isNew={job.company.employer.isNew}
        />
      </div>
      <CardDescription>
        <div className="my-5">
          <Link
            href={`/company/${job.company.id}`}
            className="hover:text-orange flex items-center gap-1 font-medium"
          >
            <Building className="text-message-green size-4" strokeWidth={2.5} />
            {job.company.name}
          </Link>
        </div>
      </CardDescription>
      <CardContent>
        <div className="flex flex-wrap gap-2">
          <Pill variant="light">
            <div className="flex items-center gap-1">
              <MapPin className="text-message-green size-4" strokeWidth={2.5} /> {job.city},{" "}
              {job.state}
            </div>
          </Pill>
          <Pill variant="light">
            <div className="flex items-center gap-1">
              <Clock className="text-message-green size-4" strokeWidth={2.5} />
              {JOB_TYPE_LABELS[job.jobType] ?? job.jobType}
            </div>
          </Pill>
          <Pill variant="light">
            <div className="flex items-center gap-1">
              <Car className="text-message-green size-4" strokeWidth={2.5} />
              {ARRANGEMENT_LABELS[job.workArrangement] ?? job.workArrangement}
            </div>
          </Pill>
          {job.workAuthRequired && (
            <Pill variant="light">
              <div className="flex items-center gap-1">
                <Check className="text-message-green size-4" strokeWidth={2.5} />
                Work auth required
              </div>
            </Pill>
          )}
        </div>

        <div className="my-6 grid grid-cols-2 gap-4">
          <div>
            <p className="text-md font-medium tracking-wide">Pay</p>
            <p className="text-muted mt-1 text-sm font-medium">
              From ${Number(job.minHourlyRate).toFixed(2)}/hr
            </p>
            {job.payNotes && <p className="text-muted mt-0.5 text-xs">{job.payNotes}</p>}
          </div>

          {sortedDays.length > 0 && (
            <div>
              <p className="text-md font-medium tracking-wide">Work days</p>
              <p className="text-muted mt-1 text-sm font-medium">
                {sortedDays.map((d) => DAY_LABELS[d] ?? d).join(", ")}
              </p>
              {job.scheduleNotes && (
                <p className="text-muted mt-0.5 text-xs">{job.scheduleNotes}</p>
              )}
            </div>
          )}

          {job.requiredLanguages.length > 0 && (
            <div>
              <p className="text-md font-medium tracking-wide">Languages</p>
              <p className="text-muted mt-1 text-sm font-medium">
                {job.requiredLanguages.map((l) => l.language.name).join(", ")}
              </p>
            </div>
          )}
        </div>

        <div>
          <div className="mb-1 flex items-center gap-1 font-medium">
            <Info className="text-message-green size-4" strokeWidth={2.5} />
            About the role
          </div>
          <div className="rounded-sm bg-white/70 px-3 py-2 text-sm shadow-xl">
            {job.description}
          </div>
        </div>

        {job.whatWereLookingFor && (
          <div className="my-8">
            <div className="mb-1 flex items-center gap-1 font-medium">
              <SearchCheck className="text-message-green size-4" strokeWidth={2.5} />
              What we&apos;re looking for
            </div>
            <div className="rounded-sm bg-white/70 p-3 text-sm shadow-xl">
              {job.whatWereLookingFor}
            </div>
          </div>
        )}

        <div className="mt-4">
          <Button asChild variant="ghost" size="sm" className="text-muted-foreground w-full">
            <Link href={`/jobs/${job.id}`}>View full listing ↗</Link>
          </Button>
        </div>
      </CardContent>
    </Panel>
  );
}
