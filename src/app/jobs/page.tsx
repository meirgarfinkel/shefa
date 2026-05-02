"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { ChevronDownIcon } from "lucide-react";
import { trpc } from "@/lib/trpc/provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { JobCard } from "@/components/ui/job-card";
import { PageHeader } from "@/components/ui/page-header";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type ArrangementValue = "ON_SITE" | "REMOTE" | "HYBRID";
type DayValue = "SUN" | "MON" | "TUE" | "WED" | "THU" | "FRI" | "SAT";

const ARRANGEMENT_OPTIONS: { value: ArrangementValue; label: string }[] = [
  { value: "ON_SITE", label: "On-site" },
  { value: "REMOTE", label: "Remote" },
  { value: "HYBRID", label: "Hybrid" },
];

const DAY_OPTIONS: { value: DayValue; label: string }[] = [
  { value: "SUN", label: "Sunday" },
  { value: "MON", label: "Monday" },
  { value: "TUE", label: "Tuesday" },
  { value: "WED", label: "Wednesday" },
  { value: "THU", label: "Thursday" },
  { value: "FRI", label: "Friday" },
  { value: "SAT", label: "Saturday" },
];

const RADIUS_OPTIONS = [
  { value: "5", label: "Within 5 miles" },
  { value: "10", label: "Within 10 miles" },
  { value: "25", label: "Within 25 miles" },
  { value: "50", label: "Within 50 miles" },
  { value: "100", label: "Within 100 miles" },
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
  const [radius, setRadius] = useState("any");
  const [jobType, setJobType] = useState("any");
  const [arrangements, setArrangements] = useState<ArrangementValue[]>([]);
  const [workDays, setWorkDays] = useState<DayValue[]>([]);
  const [skillIds, setSkillIds] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<"newest" | "closest">("newest");

  const locationInitialized = useRef(false);

  const city = useDebounce(cityInput, 400);
  const state = useDebounce(stateInput, 400);

  const { data: skillGroups } = trpc.taxonomy.skills.useQuery();

  // Fetch the logged-in user's location to auto-fill the filter
  const { data: seekerProfile } = trpc.seeker.getMyProfile.useQuery(undefined, {
    enabled: session?.user?.role === "SEEKER",
  });
  const { data: employerProfile } = trpc.employer.getProfile.useQuery(undefined, {
    enabled: session?.user?.role === "EMPLOYER",
  });

  // Auto-fill location from profile on first load
  useEffect(() => {
    if (locationInitialized.current) return;
    const profileCity = seekerProfile?.city ?? employerProfile?.city;
    const profileState = seekerProfile?.state ?? employerProfile?.state;
    if (!profileCity || !profileState) return;
    setCityInput(profileCity);
    setStateInput(profileState);
    setRadius("25");
    locationInitialized.current = true;
  }, [seekerProfile, employerProfile]);

  const { data: jobs, isLoading } = trpc.jobPosting.list.useQuery({
    city: city || undefined,
    state: state || undefined,
    radiusMiles: radius !== "any" ? Number(radius) : undefined,
    jobType: jobType !== "any" ? [jobType as "FULL_TIME" | "PART_TIME" | "EITHER"] : undefined,
    workArrangement: arrangements.length ? arrangements : undefined,
    workDays: workDays.length ? workDays : undefined,
    skillIds: skillIds.length ? skillIds : undefined,
    sortBy,
  });

  const hasFilters =
    !!city ||
    !!state ||
    radius !== "any" ||
    jobType !== "any" ||
    arrangements.length > 0 ||
    workDays.length > 0 ||
    skillIds.length > 0;

  function clearFilters() {
    setCityInput("");
    setStateInput("");
    setRadius("any");
    setJobType("any");
    setArrangements([]);
    setWorkDays([]);
    setSkillIds([]);
    setSortBy("newest");
    locationInitialized.current = false;
  }

  return (
    <div className="mx-auto max-w-4xl px-3 py-8 md:px-8">
      <PageHeader
        title="Job listings"
        description="Entry-level roles at employers who invest in their people."
        actions={
          session?.user?.role === "EMPLOYER" ? (
            <Button asChild>
              <Link href="/employer/jobs/new">Post a job</Link>
            </Button>
          ) : undefined
        }
      />

      {/* Compact filter bar */}
      <div className="border-border bg-card mb-6 rounded-lg border p-3">
        <div className="flex flex-wrap items-center gap-2">
          {/* Location */}
          <Input
            value={cityInput}
            onChange={(e) => setCityInput(e.target.value)}
            placeholder="City"
            className="h-8 w-28 text-sm"
          />
          <Input
            value={stateInput}
            onChange={(e) => setStateInput(e.target.value)}
            placeholder="ST"
            maxLength={2}
            className="h-8 w-10 text-sm"
          />
          <Select value={radius} onValueChange={setRadius}>
            <SelectTrigger className="h-8 w-40 text-sm">
              <SelectValue placeholder="Any distance" />
            </SelectTrigger>
            <SelectContent position="popper">
              <SelectItem value="any">Any distance</SelectItem>
              {RADIUS_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="bg-border h-5 w-px" />

          {/* Job type */}
          <Select value={jobType} onValueChange={setJobType}>
            <SelectTrigger className="h-8 text-sm">
              <SelectValue placeholder="Job type" />
            </SelectTrigger>
            <SelectContent position="popper">
              <SelectItem value="any">Any type</SelectItem>
              <SelectItem value="FULL_TIME">Full-time</SelectItem>
              <SelectItem value="PART_TIME">Part-time</SelectItem>
              <SelectItem value="EITHER">Full or part-time</SelectItem>
            </SelectContent>
          </Select>

          {/* Arrangement */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="border-border bg-muted h-8 gap-1.5 font-normal">
                {arrangements.length > 0 ? `Arrangement (${arrangements.length})` : "Arrangement"}
                <ChevronDownIcon className="text-muted-foreground size-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              {ARRANGEMENT_OPTIONS.map((opt) => (
                <DropdownMenuCheckboxItem
                  key={opt.value}
                  checked={arrangements.includes(opt.value)}
                  onCheckedChange={() => setArrangements((prev) => toggleItem(prev, opt.value))}
                >
                  {opt.label}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Work days */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="border-border bg-muted h-8 gap-1.5 font-normal">
                {workDays.length > 0 ? `Days (${workDays.length})` : "Days"}
                <ChevronDownIcon className="text-muted-foreground size-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              {DAY_OPTIONS.map((day) => (
                <DropdownMenuCheckboxItem
                  key={day.value}
                  checked={workDays.includes(day.value)}
                  onCheckedChange={() => setWorkDays((prev) => toggleItem(prev, day.value))}
                >
                  {day.label}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Skills */}
          {skillGroups && Object.keys(skillGroups).length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  className="border-border bg-muted h-8 gap-1.5 font-normal"
                >
                  {skillIds.length > 0 ? `Skills (${skillIds.length})` : "Skills"}
                  <ChevronDownIcon className="text-muted-foreground size-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="max-h-64 overflow-y-auto">
                {Object.entries(skillGroups).map(([category, skills], i) => (
                  <div key={category}>
                    {i > 0 && <DropdownMenuSeparator />}
                    <DropdownMenuLabel>{category}</DropdownMenuLabel>
                    {skills.map((skill) => (
                      <DropdownMenuCheckboxItem
                        key={skill.id}
                        checked={skillIds.includes(skill.id)}
                        onCheckedChange={() => setSkillIds((prev) => toggleItem(prev, skill.id))}
                      >
                        {skill.name}
                      </DropdownMenuCheckboxItem>
                    ))}
                  </div>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          <div className="bg-border h-5 w-px" />

          {/* Sort */}
          <Select value={sortBy} onValueChange={(v) => setSortBy(v as "newest" | "closest")}>
            <SelectTrigger className="h-8 w-32 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent position="popper">
              <SelectItem value="newest">Newest</SelectItem>
              <SelectItem value="closest">Closest</SelectItem>
            </SelectContent>
          </Select>

          {hasFilters && (
            <Button variant="ghost" className="h-8 text-sm" onClick={clearFilters}>
              Clear
            </Button>
          )}
        </div>
      </div>

      {/* Results count */}
      {!isLoading && jobs !== undefined && (
        <p className="text-muted-foreground mt-2 mb-4 text-sm">
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
              showStatus={Boolean(employerProfile)}
              companyName={job.employerProfile.companyName}
              href={`/jobs/${job.id}`}
              applicationCount={job._count.applications}
            />
          ))}
        </div>
      )}
    </div>
  );
}
