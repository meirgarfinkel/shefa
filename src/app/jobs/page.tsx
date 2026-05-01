"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { trpc } from "@/lib/trpc/provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { JobCard } from "@/components/ui/job-card";
import { PageHeader } from "@/components/ui/page-header";

type JobTypeValue = "FULL_TIME" | "PART_TIME" | "EITHER";
type ArrangementValue = "ON_SITE" | "REMOTE" | "HYBRID";
type DayValue = "SUN" | "MON" | "TUE" | "WED" | "THU" | "FRI" | "SAT";

const JOB_TYPE_OPTIONS: { value: JobTypeValue; label: string }[] = [
  { value: "FULL_TIME", label: "Full-time" },
  { value: "PART_TIME", label: "Part-time" },
  { value: "EITHER", label: "Either" },
];

const ARRANGEMENT_OPTIONS: { value: ArrangementValue; label: string }[] = [
  { value: "ON_SITE", label: "On-site" },
  { value: "REMOTE", label: "Remote" },
  { value: "HYBRID", label: "Hybrid" },
];

const DAY_OPTIONS: { value: DayValue; label: string }[] = [
  { value: "SUN", label: "Sun" },
  { value: "MON", label: "Mon" },
  { value: "TUE", label: "Tue" },
  { value: "WED", label: "Wed" },
  { value: "THU", label: "Thu" },
  { value: "FRI", label: "Fri" },
  { value: "SAT", label: "Sat" },
];

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

function toggleItem<T>(arr: T[], item: T): T[] {
  return arr.includes(item) ? arr.filter((x) => x !== item) : [...arr, item];
}

export default function JobsPage() {
  const { data: session } = useSession();

  const [cityInput, setCityInput] = useState("");
  const [stateInput, setStateInput] = useState("");
  const [jobTypes, setJobTypes] = useState<JobTypeValue[]>([]);
  const [arrangements, setArrangements] = useState<ArrangementValue[]>([]);
  const [workDays, setWorkDays] = useState<DayValue[]>([]);
  const [skillIds, setSkillIds] = useState<string[]>([]);
  const [showSkillFilter, setShowSkillFilter] = useState(false);

  const city = useDebounce(cityInput, 300);
  const state = useDebounce(stateInput, 300);

  const { data: skillGroups } = trpc.taxonomy.skills.useQuery();

  const { data: jobs, isLoading } = trpc.jobPosting.list.useQuery({
    city: city || undefined,
    state: state || undefined,
    jobType: jobTypes.length ? jobTypes : undefined,
    workArrangement: arrangements.length ? arrangements : undefined,
    workDays: workDays.length ? workDays : undefined,
    skillIds: skillIds.length ? skillIds : undefined,
  });

  const hasFilters =
    !!city ||
    !!state ||
    jobTypes.length > 0 ||
    arrangements.length > 0 ||
    workDays.length > 0 ||
    skillIds.length > 0;

  function clearFilters() {
    setCityInput("");
    setStateInput("");
    setJobTypes([]);
    setArrangements([]);
    setWorkDays([]);
    setSkillIds([]);
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 md:px-8">
      <PageHeader
        title="Job listings"
        description="Entry-level roles at employers who invest in their people."
        actions={
          session?.user?.role === "EMPLOYER" ? (
            <Button
              asChild
              className="border-primary/40 bg-primary/15 text-primary hover:bg-primary/25 border transition-colors duration-150"
            >
              <Link href="/employer/jobs/new">Post a job</Link>
            </Button>
          ) : undefined
        }
      />

      {/* Filters */}
      <div className="border-border bg-card mb-8 rounded-lg border p-4">
        <div className="space-y-4">
          {/* Location row */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="sm:col-span-2">
              <label className="text-muted-foreground mb-1 block text-xs font-medium tracking-wide uppercase">
                City
              </label>
              <Input
                value={cityInput}
                onChange={(e) => setCityInput(e.target.value)}
                placeholder="e.g. Brooklyn"
                className="h-8 text-sm"
              />
            </div>
            <div>
              <label className="text-muted-foreground mb-1 block text-xs font-medium tracking-wide uppercase">
                State
              </label>
              <Input
                value={stateInput}
                onChange={(e) => setStateInput(e.target.value)}
                placeholder="NY"
                maxLength={2}
                className="h-8 text-sm"
              />
            </div>
            <div className="flex items-end">
              {hasFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-full text-xs"
                  onClick={clearFilters}
                >
                  Clear filters
                </Button>
              )}
            </div>
          </div>

          <Separator />

          {/* Checkbox filters */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-muted-foreground mb-2 text-xs font-medium tracking-wide uppercase">
                Job type
              </p>
              <div className="flex flex-wrap gap-x-4 gap-y-2">
                {JOB_TYPE_OPTIONS.map((opt) => (
                  <label key={opt.value} className="flex cursor-pointer items-center gap-2">
                    <Checkbox
                      checked={jobTypes.includes(opt.value)}
                      onCheckedChange={() => setJobTypes((prev) => toggleItem(prev, opt.value))}
                    />
                    <span className="text-sm">{opt.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <p className="text-muted-foreground mb-2 text-xs font-medium tracking-wide uppercase">
                Arrangement
              </p>
              <div className="flex flex-wrap gap-x-4 gap-y-2">
                {ARRANGEMENT_OPTIONS.map((opt) => (
                  <label key={opt.value} className="flex cursor-pointer items-center gap-2">
                    <Checkbox
                      checked={arrangements.includes(opt.value)}
                      onCheckedChange={() => setArrangements((prev) => toggleItem(prev, opt.value))}
                    />
                    <span className="text-sm">{opt.label}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* Work days */}
          <div>
            <p className="text-muted-foreground mb-2 text-xs font-medium tracking-wide uppercase">
              Work days
            </p>
            <div className="flex flex-wrap gap-2">
              {DAY_OPTIONS.map((day) => (
                <label
                  key={day.value}
                  className={`flex cursor-pointer items-center justify-center rounded-md border px-3 py-1 text-xs transition-colors duration-150 ${
                    workDays.includes(day.value)
                      ? "border-primary/40 bg-primary/15 text-primary"
                      : "border-border hover:bg-muted"
                  }`}
                >
                  <input
                    type="checkbox"
                    className="sr-only"
                    checked={workDays.includes(day.value)}
                    onChange={() => setWorkDays((prev) => toggleItem(prev, day.value))}
                  />
                  {day.label}
                </label>
              ))}
            </div>
          </div>

          {/* Skills (collapsible) */}
          {skillGroups && Object.keys(skillGroups).length > 0 && (
            <div>
              <button
                type="button"
                className="text-muted-foreground flex items-center gap-1 text-xs font-medium tracking-wide uppercase"
                onClick={() => setShowSkillFilter((v) => !v)}
              >
                <span>Skills</span>
                {skillIds.length > 0 && (
                  <span className="border-primary/25 bg-primary/15 text-primary ml-1 rounded-full border px-1.5 py-0.5 text-xs font-semibold">
                    {skillIds.length}
                  </span>
                )}
                <span className="ml-1">{showSkillFilter ? "▲" : "▼"}</span>
              </button>

              {showSkillFilter && (
                <div className="mt-3 max-h-48 space-y-3 overflow-y-auto pr-1">
                  {Object.entries(skillGroups).map(([category, skills]) => (
                    <div key={category}>
                      <p className="text-muted-foreground mb-1.5 text-xs font-semibold tracking-wider uppercase">
                        {category}
                      </p>
                      <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
                        {skills.map((skill) => (
                          <label
                            key={skill.id}
                            className="flex cursor-pointer items-center gap-1.5"
                          >
                            <Checkbox
                              checked={skillIds.includes(skill.id)}
                              onCheckedChange={() =>
                                setSkillIds((prev) => toggleItem(prev, skill.id))
                              }
                            />
                            <span className="text-xs">{skill.name}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Results count */}
      {!isLoading && jobs !== undefined && (
        <p className="text-muted-foreground mb-4 text-sm">
          {jobs.length === 0
            ? hasFilters
              ? "No jobs match your filters."
              : "No open positions yet. Check back soon."
            : `${jobs.length} job${jobs.length === 1 ? "" : "s"} found`}
        </p>
      )}

      {isLoading && (
        <div className="text-muted-foreground py-16 text-center">Loading listings…</div>
      )}

      {/* Job cards */}
      {!isLoading && jobs && jobs.length > 0 && (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          {jobs.map((job) => (
            <JobCard
              key={job.id}
              id={job.id}
              title={job.title}
              city={job.city}
              state={job.state}
              jobType={job.jobType}
              workArrangement={job.workArrangement}
              minHourlyRate={Number(job.minHourlyRate)}
              status={job.status}
              companyName={job.employerProfile.companyName}
              href={`/jobs/${job.id}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
