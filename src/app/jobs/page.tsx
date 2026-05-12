"use client";

import { useState, useEffect, useRef, useMemo, Suspense } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { SearchIcon } from "lucide-react";
import { trpc } from "@/lib/trpc/provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { JobCard } from "@/components/ui/job-card";
import { PageHeader } from "@/components/ui/page-header";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FilterTrigger } from "@/components/ui/filter-trigger";

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
  const [sortBy, setSortByState] = useState<"best" | "newest" | "closest" | "pay">(() => {
    const v = searchParams.get("sortBy");
    if (v === "closest") return "closest";
    if (v === "best") return "best";
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

  function setSortBy(val: "best" | "newest" | "closest" | "pay") {
    setSortByState(val);
    updateParams({ sortBy: val !== "newest" ? val : null });
  }

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
    sortBy: sortBy === "best" ? "newest" : sortBy,
  });

  const isSearchMode = debouncedQuery.length > 0;
  const isLoading = isSearchMode ? searchIsLoading : listIsLoading;

  const refCity = useMemo(() => cities.find((c) => c.name === city) ?? null, [cities, city]);

  const displayJobs = useMemo(() => {
    const jobs = isSearchMode ? searchResults : listResults;
    if (!jobs) return undefined;

    const sorted = [...jobs];

    if (sortBy === "pay") {
      sorted.sort((a, b) => Number(b.minHourlyRate) - Number(a.minHourlyRate));
    } else if (sortBy === "newest") {
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
    const profileCity = seekerProfile?.city ?? employerProfile?.city;
    const profileState = seekerProfile?.state ?? employerProfile?.state;
    const hasProfileLocation = !!(profileCity && profileState);
    if (hasProfileLocation) {
      setStateAbbrState(profileState);
      setCityState(profileCity);
      setRadiusState("25");
    } else {
      setStateAbbrState("");
      setCityState("");
      setRadiusState("any");
    }
    setJobTypeState("any");
    setArrangementsState([]);
    setWorkDaysState([]);
    setSkillIdsState([]);
    setSortByState("newest");
    const params = new URLSearchParams();
    if (hasProfileLocation) {
      params.set("state", profileState);
      params.set("city", profileCity);
      params.set("radius", "25");
    }
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    locationInitialized.current = true;
  }

  return (
    <div className="mx-auto max-w-6xl px-4 pt-8 md:flex md:h-[calc(100vh-4rem)] md:flex-col">
      <PageHeader
        title="Job listings"
        description="Roles at employers who invest in their people."
        actions={
          session?.user?.role === "EMPLOYER" ? (
            <Button asChild>
              <Link href="/employer/jobs/new">Post a job</Link>
            </Button>
          ) : undefined
        }
      />

      <div className="flex flex-col gap-6 md:flex-1 md:flex-row md:overflow-hidden">
        {/* ── Filter sidebar ── */}
        <aside className="w-full shrink-0 space-y-4 md:w-50">
          {/* Search */}
          <div className="relative">
            <SearchIcon className="text-light absolute top-1/2 left-3 size-4 -translate-y-1/2" />
            <Input
              placeholder="Search jobs…"
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Location */}
          <div>
            <p className="mb-1.5 px-1 text-xs font-medium">Location</p>
            <div className="space-y-1.5">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <FilterTrigger className="w-full justify-between">
                    {stateAbbr
                      ? `${stateAbbr} — ${states.find((s) => s.abbr === stateAbbr)?.name ?? stateAbbr}`
                      : "State"}
                  </FilterTrigger>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  className="max-h-64 overflow-y-auto whitespace-nowrap"
                >
                  <DropdownMenuRadioGroup value={stateAbbr} onValueChange={setStateAbbr}>
                    {states.map((s) => (
                      <DropdownMenuRadioItem key={s.abbr} value={s.abbr}>
                        {s.abbr} — {s.name}
                      </DropdownMenuRadioItem>
                    ))}
                  </DropdownMenuRadioGroup>
                </DropdownMenuContent>
              </DropdownMenu>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <FilterTrigger className="w-full justify-between" disabled={!stateAbbr}>
                    {city || (stateAbbr ? "City" : "State first")}
                  </FilterTrigger>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="max-h-64 overflow-y-auto">
                  <DropdownMenuRadioGroup value={city} onValueChange={setCity}>
                    {cities.map((c) => (
                      <DropdownMenuRadioItem key={c.name} value={c.name}>
                        {c.name}
                      </DropdownMenuRadioItem>
                    ))}
                  </DropdownMenuRadioGroup>
                </DropdownMenuContent>
              </DropdownMenu>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <FilterTrigger className="w-full justify-between">
                    {radius === "any"
                      ? "Any distance"
                      : (RADIUS_OPTIONS.find((r) => r.value === radius)?.label ?? radius)}
                  </FilterTrigger>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuRadioGroup value={radius} onValueChange={setRadius}>
                    <DropdownMenuRadioItem value="any">Any distance</DropdownMenuRadioItem>
                    {RADIUS_OPTIONS.map((opt) => (
                      <DropdownMenuRadioItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </DropdownMenuRadioItem>
                    ))}
                  </DropdownMenuRadioGroup>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Filters */}
          <div>
            <p className="mb-1.5 px-1 text-xs font-medium">Filters</p>
            <div className="space-y-1.5">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <FilterTrigger className="w-full justify-between">
                    {jobType === "any"
                      ? "Job type"
                      : jobType === "FULL_TIME"
                        ? "Full-time"
                        : "Part-time"}
                  </FilterTrigger>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuRadioGroup value={jobType} onValueChange={setJobType}>
                    <DropdownMenuRadioItem value="any">Any type</DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="FULL_TIME">Full-time</DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="PART_TIME">Part-time</DropdownMenuRadioItem>
                  </DropdownMenuRadioGroup>
                </DropdownMenuContent>
              </DropdownMenu>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <FilterTrigger
                    className="w-full justify-between"
                    activeCount={arrangements.length}
                  >
                    Arrangement
                  </FilterTrigger>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
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

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <FilterTrigger className="w-full justify-between" activeCount={workDays.length}>
                    Days
                  </FilterTrigger>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
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

              {skillGroups && Object.keys(skillGroups).length > 0 && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <FilterTrigger className="w-full justify-between" activeCount={skillIds.length}>
                      Skills
                    </FilterTrigger>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="max-h-64 overflow-y-auto">
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
            </div>
          </div>

          {hasFilters && (
            <Button variant="ghost" onClick={clearFilters} className="w-full">
              Clear filters
            </Button>
          )}
        </aside>

        {/* ── Main content ── */}
        <div className="min-w-0 flex-1 md:flex md:flex-col md:overflow-hidden">
          {/* Results count + sort — does not scroll */}
          {!isLoading && displayJobs !== undefined && (
            <div className="mb-4 flex items-center justify-between">
              <p className="text-sm">
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

              <div className="flex items-center gap-2">
                <span className="text-sm">Sort by:</span>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <FilterTrigger>
                      {sortBy === "best"
                        ? "Best match"
                        : sortBy === "newest"
                          ? "Newest"
                          : sortBy === "closest"
                            ? "Closest"
                            : "Salary"}
                    </FilterTrigger>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuRadioGroup
                      value={sortBy}
                      onValueChange={(v) => setSortBy(v as "best" | "newest" | "closest" | "pay")}
                    >
                      <DropdownMenuRadioItem value="best">Best match</DropdownMenuRadioItem>
                      <DropdownMenuRadioItem value="newest">Newest</DropdownMenuRadioItem>
                      <DropdownMenuRadioItem value="closest">Closest</DropdownMenuRadioItem>
                      <DropdownMenuRadioItem value="pay">Salary</DropdownMenuRadioItem>
                    </DropdownMenuRadioGroup>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          )}

          {/* Scrollable jobs list */}
          <div className="md:flex-1 md:overflow-y-auto">
            {isLoading && (
              <div className="text-muted-foreground py-16 text-center">Loading listings…</div>
            )}

            {!isLoading && displayJobs && displayJobs.length > 0 && (
              <div className="space-y-3 pb-8">
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
        </div>
      </div>
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
