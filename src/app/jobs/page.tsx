"use client";

import { useState, useEffect, useRef, useMemo, Suspense } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { ChevronDownIcon, SearchIcon } from "lucide-react";
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

function approxDistanceSq(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const dx = (lon2 - lon1) * Math.cos((lat1 * Math.PI) / 180);
  const dy = lat2 - lat1;
  return dx * dx + dy * dy;
}

function toggleItem<T>(arr: T[], item: T): T[] {
  return arr.includes(item) ? arr.filter((x) => x !== item) : [...arr, item];
}

function JobsContent() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const { data: session } = useSession();

  // Initialize filter state from URL search params so filters persist across navigation
  const [stateAbbr, setStateAbbrState] = useState(() => searchParams.get("state") ?? "");
  const [city, setCityState] = useState(() => searchParams.get("city") ?? "");
  const [radius, setRadiusState] = useState(() => searchParams.get("radius") ?? "any");
  const [jobType, setJobTypeState] = useState(() => searchParams.get("jobType") ?? "any");
  const [arrangements, setArrangementsState] = useState<ArrangementValue[]>(() => {
    const v = searchParams.get("arrangements");
    return v ? (v.split(",").filter(Boolean) as ArrangementValue[]) : [];
  });
  const [workDays, setWorkDaysState] = useState<DayValue[]>(() => {
    const v = searchParams.get("days");
    return v ? (v.split(",").filter(Boolean) as DayValue[]) : [];
  });
  const [skillIds, setSkillIdsState] = useState<string[]>(() => {
    const v = searchParams.get("skills");
    return v ? v.split(",").filter(Boolean) : [];
  });
  const [sortBy, setSortByState] = useState<"best" | "newest" | "closest">(() => {
    const v = searchParams.get("sortBy");
    if (v === "closest") return "closest";
    if (v === "best") return "best";
    // Default to "best" when a search query is already in the URL
    return searchParams.get("q") ? "best" : "newest";
  });

  const [searchQuery, setSearchQuery] = useState(() => searchParams.get("q") ?? "");
  const [debouncedQuery, setDebouncedQuery] = useState(searchQuery);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const locationInitialized = useRef(false);

  const { data: states = [] } = trpc.location.states.useQuery();
  const { data: cities = [] } = trpc.location.citiesByState.useQuery(
    { stateAbbr },
    { enabled: !!stateAbbr },
  );

  const { data: skillGroups } = trpc.taxonomy.skills.useQuery();

  const { data: seekerProfile } = trpc.seeker.getMyProfile.useQuery(undefined, {
    enabled: session?.user?.role === "SEEKER",
  });
  const { data: employerProfile } = trpc.employer.getProfile.useQuery(undefined, {
    enabled: session?.user?.role === "EMPLOYER",
  });

  function updateParams(updates: Record<string, string | string[] | null | undefined>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(updates)) {
      if (value == null || value === "" || (Array.isArray(value) && value.length === 0)) {
        params.delete(key);
      } else if (Array.isArray(value)) {
        params.set(key, value.join(","));
      } else {
        params.set(key, value);
      }
    }
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  function setStateAbbr(val: string) {
    setStateAbbrState(val);
    setCityState("");
    updateParams({ state: val || null, city: null });
  }

  function setCity(val: string) {
    setCityState(val);
    updateParams({ city: val || null });
  }

  function setRadius(val: string) {
    setRadiusState(val);
    updateParams({ radius: val !== "any" ? val : null });
  }

  function setJobType(val: string) {
    setJobTypeState(val);
    updateParams({ jobType: val !== "any" ? val : null });
  }

  function setArrangements(val: ArrangementValue[]) {
    setArrangementsState(val);
    updateParams({ arrangements: val });
  }

  function setWorkDays(val: DayValue[]) {
    setWorkDaysState(val);
    updateParams({ days: val });
  }

  function setSkillIds(val: string[]) {
    setSkillIdsState(val);
    updateParams({ skills: val });
  }

  function handleSearchChange(value: string) {
    setSearchQuery(value);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => {
      setDebouncedQuery(value);
      updateParams({ q: value || null });
    }, 300);
  }

  function setSortBy(val: "best" | "newest" | "closest") {
    setSortByState(val);
    updateParams({ sortBy: val !== "newest" ? val : null });
  }

  // Auto-fill location from profile only when URL has no location filter set
  useEffect(() => {
    if (locationInitialized.current) return;
    if (searchParams.get("state")) {
      locationInitialized.current = true;
      return;
    }
    const profileCity = seekerProfile?.city ?? employerProfile?.city;
    const profileState = seekerProfile?.state ?? employerProfile?.state;
    if (!profileCity || !profileState) return;

    setStateAbbrState(profileState);
    setCityState(profileCity);
    setRadiusState("25");

    const params = new URLSearchParams(searchParams.toString());
    params.set("state", profileState);
    params.set("city", profileCity);
    params.set("radius", "25");
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });

    locationInitialized.current = true;
  }, [seekerProfile, employerProfile, searchParams, pathname, router]);

  const { data: searchResults, isLoading: searchIsLoading } = trpc.jobPosting.search.useQuery(
    { q: debouncedQuery },
    { enabled: debouncedQuery.length > 0 },
  );

  const { data: listResults, isLoading: listIsLoading } = trpc.jobPosting.list.useQuery({
    city: city || undefined,
    state: stateAbbr || undefined,
    radiusMiles: radius !== "any" ? Number(radius) : undefined,
    jobType: jobType !== "any" ? [jobType as "FULL_TIME" | "PART_TIME" | "EITHER"] : undefined,
    workArrangement: arrangements.length ? arrangements : undefined,
    workDays: workDays.length ? workDays : undefined,
    skillIds: skillIds.length ? skillIds : undefined,
    // "best" has no server-side meaning for the list query; treat as "newest"
    sortBy: sortBy === "best" ? "newest" : sortBy,
  });

  const isSearchMode = debouncedQuery.length > 0;
  const isLoading = isSearchMode ? searchIsLoading : listIsLoading;

  // Reference city coords for client-side "closest" sort in search mode
  const refCity = useMemo(() => cities.find((c) => c.name === city) ?? null, [cities, city]);

  // Client-side sort of search results. Re-runs on sort change without re-fetching.
  // In list mode, server already applied sorting, so we pass through directly.
  const displayJobs = useMemo(() => {
    if (!isSearchMode) return listResults;
    if (!searchResults) return undefined;

    const sorted = [...searchResults];
    if (sortBy === "newest") {
      sorted.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } else if (sortBy === "closest" && refCity) {
      sorted.sort((a, b) => {
        const da =
          a.lat != null && a.lon != null
            ? approxDistanceSq(refCity.lat, refCity.lon, a.lat, a.lon)
            : Infinity;
        const db =
          b.lat != null && b.lon != null
            ? approxDistanceSq(refCity.lat, refCity.lon, b.lat, b.lon)
            : Infinity;
        return da - db;
      });
    }
    // "best": already ordered by rank DESC from the backend
    return sorted.slice(0, 50);
  }, [searchResults, listResults, isSearchMode, sortBy, refCity]);

  const hasFilters =
    !!searchQuery ||
    !!city ||
    !!stateAbbr ||
    radius !== "any" ||
    jobType !== "any" ||
    arrangements.length > 0 ||
    workDays.length > 0 ||
    skillIds.length > 0;

  function clearFilters() {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    setSearchQuery("");
    setDebouncedQuery("");
    setStateAbbrState("");
    setCityState("");
    setRadiusState("any");
    setJobTypeState("any");
    setArrangementsState([]);
    setWorkDaysState([]);
    setSkillIdsState([]);
    setSortByState("newest");
    locationInitialized.current = false;
    router.replace(pathname, { scroll: false });
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

      {/* Search */}
      <div className="relative mb-4">
        <SearchIcon className="text-text-muted absolute top-1/2 left-3 size-4 -translate-y-1/2" />
        <Input
          placeholder="Search jobs by title or description…"
          value={searchQuery}
          onChange={(e) => handleSearchChange(e.target.value)}
          className="bg-surface-3 pl-9 text-sm"
        />
      </div>

      {/* Compact filter bar */}
      <div className="bg-surface-3 mb-6 rounded-lg bg-linear-to-b from-white/15 via-transparent to-transparent">
        <div className="from-surface-1/50 flex flex-wrap items-center gap-2 rounded-lg bg-linear-to-t via-transparent to-transparent p-4">
          {/* Location */}
          <Select value={stateAbbr} onValueChange={(val) => setStateAbbr(val)}>
            <SelectTrigger className="h-8 w-36 text-sm">
              <SelectValue placeholder="State" />
            </SelectTrigger>
            <SelectContent position="popper">
              {states.map((s) => (
                <SelectItem key={s.abbr} value={s.abbr}>
                  {s.abbr} — {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={city} onValueChange={setCity} disabled={!stateAbbr}>
            <SelectTrigger className="h-8 w-36 text-sm">
              <SelectValue placeholder={stateAbbr ? "City" : "State first"} />
            </SelectTrigger>
            <SelectContent position="popper">
              {cities.map((c) => (
                <SelectItem key={c.name} value={c.name}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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

          <div className="bg-background h-5 w-px" />

          {/* Job type */}
          <Select value={jobType} onValueChange={setJobType}>
            <SelectTrigger className="h-8 text-sm">
              <SelectValue placeholder="Job type" />
            </SelectTrigger>
            <SelectContent position="popper">
              <SelectItem value="any">Any type</SelectItem>
              <SelectItem value="FULL_TIME">Full-time</SelectItem>
              <SelectItem value="PART_TIME">Part-time</SelectItem>
            </SelectContent>
          </Select>

          {/* Arrangement */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                className="bg-primary/20 h-8 gap-1.5 rounded-lg whitespace-nowrap"
              >
                {arrangements.length > 0 ? `Arrangement (${arrangements.length})` : "Arrangement"}
                <ChevronDownIcon className="text-text-muted size-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              {ARRANGEMENT_OPTIONS.map((opt) => (
                <DropdownMenuCheckboxItem
                  key={opt.value}
                  checked={arrangements.includes(opt.value)}
                  onCheckedChange={() => setArrangements(toggleItem(arrangements, opt.value))}
                >
                  {opt.label}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Work days */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="bg-primary/20 h-8 gap-1.5 rounded-lg">
                {workDays.length > 0 ? `Days (${workDays.length})` : "Days"}
                <ChevronDownIcon className="text-text-muted size-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              {DAY_OPTIONS.map((day) => (
                <DropdownMenuCheckboxItem
                  key={day.value}
                  checked={workDays.includes(day.value)}
                  onCheckedChange={() => setWorkDays(toggleItem(workDays, day.value))}
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
                <Button variant="outline" className="bg-primary/20 h-8 gap-1.5 rounded-lg">
                  {skillIds.length > 0 ? `Skills (${skillIds.length})` : "Skills"}
                  <ChevronDownIcon className="text-text-muted size-3.5" />
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
                        onCheckedChange={() => setSkillIds(toggleItem(skillIds, skill.id))}
                      >
                        {skill.name}
                      </DropdownMenuCheckboxItem>
                    ))}
                  </div>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          <div className="bg-background h-5 w-px" />

          {/* Sort */}
          <Select
            value={sortBy}
            onValueChange={(v) => setSortBy(v as "best" | "newest" | "closest")}
          >
            <SelectTrigger className="h-8 w-36 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent position="popper">
              <SelectItem value="best">Best match</SelectItem>
              <SelectItem value="newest">Newest</SelectItem>
              <SelectItem value="closest">Closest</SelectItem>
            </SelectContent>
          </Select>

          {hasFilters && (
            <Button variant="ghost" className="h-8 rounded-lg text-sm" onClick={clearFilters}>
              Clear
            </Button>
          )}
        </div>
      </div>

      {/* Results count */}
      {!isLoading && displayJobs !== undefined && (
        <p className="text-text-muted mt-2 mb-4 text-sm">
          {isSearchMode
            ? displayJobs.length === 0
              ? `No results for "${debouncedQuery}"`
              : `${displayJobs.length} result${displayJobs.length === 1 ? "" : "s"} for "${debouncedQuery}"`
            : displayJobs.length === 0
              ? hasFilters
                ? "No jobs match your filters."
                : "No open positions yet. Check back soon."
              : `${displayJobs.length} job${displayJobs.length === 1 ? "" : "s"} found`}
        </p>
      )}

      {isLoading && <div className="text-text-muted py-16 text-center">Loading listings…</div>}

      {!isLoading && displayJobs && displayJobs.length > 0 && (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          {displayJobs.map((job) => (
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

export default function JobsPage() {
  return (
    <Suspense>
      <JobsContent />
    </Suspense>
  );
}
