"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { trpc } from "@/lib/trpc/provider";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";

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

const JOB_TYPE_LABELS: Record<string, string> = {
  FULL_TIME: "Full-time",
  PART_TIME: "Part-time",
  EITHER: "Full or Part-time",
};

const ARRANGEMENT_LABELS: Record<string, string> = {
  ON_SITE: "On-site",
  REMOTE: "Remote",
  HYBRID: "Hybrid",
};

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

  // Filter state
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
    <div className="mx-auto max-w-4xl px-4 py-10">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Job listings</h1>
          <p className="text-muted-foreground mt-1">
            Entry-level roles at employers who invest in their people.
          </p>
        </div>
        {session?.user?.role === "EMPLOYER" && (
          <Button asChild>
            <Link href="/employer/jobs/new">Post a job</Link>
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="mb-6 rounded-lg border p-4">
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
            {/* Job type */}
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

            {/* Work arrangement */}
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
                  className={`flex cursor-pointer items-center justify-center rounded-md border px-3 py-1 text-xs transition-colors ${
                    workDays.includes(day.value)
                      ? "border-primary bg-primary text-primary-foreground"
                      : "hover:bg-muted"
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
                  <span className="bg-primary text-primary-foreground ml-1 rounded-full px-1.5 py-0.5 text-[10px] font-semibold">
                    {skillIds.length}
                  </span>
                )}
                <span className="ml-1">{showSkillFilter ? "▲" : "▼"}</span>
              </button>

              {showSkillFilter && (
                <div className="mt-3 max-h-48 space-y-3 overflow-y-auto pr-1">
                  {Object.entries(skillGroups).map(([category, skills]) => (
                    <div key={category}>
                      <p className="text-muted-foreground mb-1.5 text-[10px] font-semibold tracking-wider uppercase">
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
        <div className="grid gap-4 sm:grid-cols-2">
          {jobs.map((job) => (
            <Card key={job.id} className="flex flex-col">
              <CardHeader className="pb-2">
                <p className="text-muted-foreground text-sm font-medium">
                  {job.employerProfile.companyName}
                </p>
                <CardTitle className="text-lg leading-snug">{job.title}</CardTitle>
              </CardHeader>

              <CardContent className="flex-1 space-y-3">
                <div className="flex flex-wrap gap-1.5">
                  <span className="bg-muted rounded-full px-2.5 py-0.5 text-xs">
                    {job.city}, {job.state}
                  </span>
                  <span className="bg-muted rounded-full px-2.5 py-0.5 text-xs">
                    {JOB_TYPE_LABELS[job.jobType] ?? job.jobType}
                  </span>
                  <span className="bg-muted rounded-full px-2.5 py-0.5 text-xs">
                    {ARRANGEMENT_LABELS[job.workArrangement] ?? job.workArrangement}
                  </span>
                </div>

                <p className="text-sm font-medium">
                  From ${Number(job.minHourlyRate).toFixed(2)}/hr
                </p>

                <p className="text-muted-foreground line-clamp-3 text-sm">{job.description}</p>

                {job.whatWeTeach && (
                  <p className="text-sm">
                    <span className="font-medium">We&apos;ll teach you: </span>
                    <span className="text-muted-foreground line-clamp-2">{job.whatWeTeach}</span>
                  </p>
                )}
              </CardContent>

              <CardFooter className="pt-2">
                <Button asChild variant="outline" size="sm" className="w-full">
                  <Link href={`/jobs/${job.id}`}>View job</Link>
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
