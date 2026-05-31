"use client";

import { useState, useEffect, useRef, useMemo, useCallback, Suspense } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { SearchIcon, XIcon, SlidersHorizontalIcon } from "lucide-react";
import { trpc } from "@/lib/trpc/provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { JobCard } from "@/components/ui/job-card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FilterTrigger } from "@/components/ui/filter-trigger";

type ArrangementValue = "ON_SITE" | "REMOTE" | "HYBRID";
type DayValue = "SUN" | "MON" | "TUE" | "WED" | "THU" | "FRI" | "SAT";
type SortValue = "best" | "newest" | "closest" | "pay";

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

const SORT_LABELS: Record<SortValue, string> = {
  best: "Best match",
  newest: "Newest",
  closest: "Closest",
  pay: "Salary",
};

const FILTER_KEY = "jobs_params";

function approxDistanceSq(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const dx = (lon2 - lon1) * Math.cos((lat1 * Math.PI) / 180);
  const dy = lat2 - lat1;
  return dx * dx + dy * dy;
}

function toggleItem<T>(arr: T[], item: T): T[] {
  return arr.includes(item) ? arr.filter((x) => x !== item) : [...arr, item];
}

function parseSortParam(value: string | null, hasQuery: boolean): SortValue {
  if (value === "best" || value === "newest" || value === "closest" || value === "pay") {
    return value;
  }
  return hasQuery ? "best" : "newest";
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
  const [sortBy, setSortByState] = useState<SortValue>(() =>
    parseSortParam(searchParams.get("sortBy"), !!searchParams.get("q")),
  );

  const [searchQuery, setSearchQuery] = useState(() => searchParams.get("q") ?? "");
  const [debouncedQuery, setDebouncedQuery] = useState(searchQuery);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const locationInitialized = useRef(false);
  const [filterOpen, setFilterOpen] = useState(false);

  const { data: states = [] } = trpc.location.states.useQuery();
  const { data: cities = [] } = trpc.location.citiesByState.useQuery(
    { stateAbbr },
    { enabled: !!stateAbbr },
  );

  const { data: seekerProfile } = trpc.seeker.getMyProfile.useQuery(undefined, {
    enabled: session?.user?.role === "SEEKER",
  });
  const { data: myCompanies } = trpc.company.listMine.useQuery(undefined, {
    enabled: session?.user?.role === "EMPLOYER",
  });
  const employerProfile = myCompanies?.[0];

  const searchParamsRef = useRef(searchParams);
  searchParamsRef.current = searchParams;

  const updateParams = useCallback(
    (updates: Record<string, string | string[] | null | undefined>) => {
      const params = new URLSearchParams(searchParamsRef.current.toString());
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
    },
    [pathname, router],
  );

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

  function handleSearchChange(value: string) {
    setSearchQuery(value);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => {
      setDebouncedQuery(value);
      updateParams({ q: value || null });
    }, 300);
  }

  function clearSearch() {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    setSearchQuery("");
    setDebouncedQuery("");
    updateParams({ q: null });
    setSortByState("newest");
  }

  function setSortBy(val: SortValue) {
    setSortByState(val);
    updateParams({ sortBy: val !== "newest" ? val : null });
  }

  const profileCity = seekerProfile?.city ?? employerProfile?.city;
  const profileState = seekerProfile?.state ?? employerProfile?.state;

  // On mount: if URL has no params, restore all filters from sessionStorage.
  // Runs before the profile-init effect so it can set locationInitialized first.
  useEffect(() => {
    if (searchParamsRef.current.get("state")) {
      locationInitialized.current = true;
      return;
    }
    const savedQS = sessionStorage.getItem(FILTER_KEY);
    if (!savedQS) return;
    const saved = new URLSearchParams(savedQS);
    setStateAbbrState(saved.get("state") ?? "");
    setCityState(saved.get("city") ?? "");
    setRadiusState(saved.get("radius") ?? "any");
    setJobTypeState(saved.get("jobType") ?? "any");
    const savedArr = saved.get("arrangements");
    setArrangementsState(
      savedArr ? (savedArr.split(",").filter(Boolean) as ArrangementValue[]) : [],
    );
    const savedDays = saved.get("days");
    setWorkDaysState(savedDays ? (savedDays.split(",").filter(Boolean) as DayValue[]) : []);
    setSortByState(parseSortParam(saved.get("sortBy"), !!saved.get("q")));
    const savedQ = saved.get("q");
    if (savedQ) {
      setSearchQuery(savedQ);
      setDebouncedQuery(savedQ);
    }
    router.replace(`${pathname}?${savedQS}`, { scroll: false });
    locationInitialized.current = true;
    // pathname and router are stable Next.js refs — safe to omit from deps
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persist filter state: save URL params to sessionStorage on every change.
  useEffect(() => {
    const qs = searchParams.toString();
    if (qs) sessionStorage.setItem(FILTER_KEY, qs);
  }, [searchParams]);

  // First-time setup: auto-fill location from user profile when no URL params
  // and no sessionStorage data exists.
  useEffect(() => {
    if (locationInitialized.current) return;
    if (searchParamsRef.current.get("state")) {
      locationInitialized.current = true;
      return;
    }
    if (!profileCity || !profileState) return;

    setStateAbbrState(profileState);
    setCityState(profileCity);
    setRadiusState("25");

    const params = new URLSearchParams(searchParamsRef.current.toString());
    params.set("state", profileState);
    params.set("city", profileCity);
    params.set("radius", "25");
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });

    locationInitialized.current = true;
  }, [profileCity, profileState, pathname, router]);

  const {
    data: searchResults,
    isLoading: searchIsLoading,
    error: searchError,
  } = trpc.jobPosting.search.useQuery(
    { q: debouncedQuery },
    { enabled: debouncedQuery.length > 0 },
  );

  const {
    data: listResults,
    isLoading: listIsLoading,
    error: listError,
  } = trpc.jobPosting.list.useQuery({
    city: city || undefined,
    state: stateAbbr || undefined,
    radiusMiles: radius !== "any" ? Number(radius) : undefined,
    jobType: jobType !== "any" ? [jobType as "FULL_TIME" | "PART_TIME" | "EITHER"] : undefined,
    workArrangement: arrangements.length ? arrangements : undefined,
    workDays: workDays.length ? workDays : undefined,
    sortBy: sortBy === "best" ? "newest" : sortBy,
  });

  const isSearchMode = debouncedQuery.length > 0;
  const isLoading = isSearchMode ? searchIsLoading : listIsLoading;
  const queryError = isSearchMode ? searchError : listError;

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
    workDays.length > 0;

  const activeFilterCount = [
    !!searchQuery,
    !!stateAbbr || !!city,
    radius !== "any",
    jobType !== "any",
    arrangements.length > 0,
    workDays.length > 0,
  ].filter(Boolean).length;

  function clearFilters() {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    setSearchQuery("");
    setDebouncedQuery("");
    sessionStorage.removeItem(FILTER_KEY);
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

  const countText =
    !isLoading && !queryError && displayJobs !== undefined
      ? isSearchMode
        ? displayJobs.length === 0
          ? `No results for "${debouncedQuery}"`
          : `${displayJobs.length} result${displayJobs.length === 1 ? "" : "s"} for "${debouncedQuery}"`
        : displayJobs.length === 0
          ? hasFilters
            ? "No jobs match your filters."
            : "No open positions yet. Check back soon."
          : `${displayJobs.length} job${displayJobs.length === 1 ? "" : "s"} found`
      : null;

  return (
    <div className="mx-auto max-w-6xl px-4 md:flex md:h-[calc(100vh-4rem)] md:flex-col">
      {/* ── Mobile sticky filter bar ── */}
      <div className="sticky top-16 z-10 -mx-4 flex items-center gap-2 px-4 py-2 backdrop-blur-md md:hidden">
        <Button
          variant="ghost"
          onClick={() => setFilterOpen(true)}
          className="bg-primary/20 hover:bg-primary/30 flex h-8 items-center gap-1.5 rounded-md px-3 text-sm shadow-lg transition-colors duration-100"
        >
          <SlidersHorizontalIcon className="size-3.5" />
          Filters
          {activeFilterCount > 0 && (
            <span className="bg-popover ml-0.5 rounded-full px-1.5 text-sm text-white">
              {activeFilterCount}
            </span>
          )}
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <FilterTrigger>{SORT_LABELS[sortBy]}</FilterTrigger>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuRadioGroup value={sortBy} onValueChange={(v) => setSortBy(v as SortValue)}>
              <DropdownMenuRadioItem value="best">Best match</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="newest">Newest</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="closest">Closest</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="pay">Salary</DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="ml-auto flex items-center gap-2">
          {!isLoading && displayJobs !== undefined && (
            <span className="text-muted-foreground text-sm">
              {displayJobs.length} job{displayJobs.length === 1 ? "" : "s"}
            </span>
          )}
          {session?.user?.role === "EMPLOYER" && (
            <Button asChild size="sm" className="h-7 px-2 text-sm">
              <Link href="/employer/jobs/new">Post job</Link>
            </Button>
          )}
        </div>
      </div>

      {/* ── Mobile filter dialog ── */}
      <Dialog open={filterOpen} onOpenChange={setFilterOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-md" showCloseButton>
          <DialogHeader>
            <DialogTitle>Filters</DialogTitle>
          </DialogHeader>

          {/* Search */}
          <div className="space-y-2">
            <p className="px-1 font-medium">Search</p>
            <div className="relative">
              <SearchIcon className="text-popover-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
              <Input
                placeholder="Search jobs…"
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="placeholder-popover-foreground/80 pr-8 pl-8"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={clearSearch}
                  className="text-popover-foreground hover:text-foreground absolute top-1/2 right-2.5 -translate-y-1/2 transition-colors duration-100"
                >
                  <XIcon className="size-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Location */}
          <div className="space-y-2">
            <p className="px-1 font-medium">Location</p>
            <Select value={stateAbbr || undefined} onValueChange={setStateAbbr}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="State" />
              </SelectTrigger>
              <SelectContent className="max-h-80">
                {states.map((s) => (
                  <SelectItem key={s.abbr} value={s.abbr}>
                    {s.abbr} — {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={city || undefined} onValueChange={setCity} disabled={!stateAbbr}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder={stateAbbr ? "City" : "State first"} />
              </SelectTrigger>
              <SelectContent className="max-h-64">
                {cities.map((c) => (
                  <SelectItem key={c.name} value={c.name}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={radius} onValueChange={setRadius}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="any">Any distance</SelectItem>
                {RADIUS_OPTIONS.map((r) => (
                  <SelectItem key={r.value} value={r.value}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Job type */}
          <div className="space-y-2">
            <p className="px-1 font-medium">Job type</p>
            <Select value={jobType} onValueChange={setJobType}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="any">Any type</SelectItem>
                <SelectItem value="FULL_TIME">Full-time</SelectItem>
                <SelectItem value="PART_TIME">Part-time</SelectItem>
              </SelectContent>
            </Select>

            {/* Arrangement */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <FilterTrigger
                  className="w-full justify-between bg-white/60 font-normal"
                  activeCount={arrangements.length}
                >
                  Arrangement
                </FilterTrigger>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
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
                <FilterTrigger
                  className="w-full justify-between bg-white/60 font-normal"
                  activeCount={workDays.length}
                >
                  Days
                </FilterTrigger>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
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
          </div>

          {/* Sort */}
          <div className="space-y-2">
            <p className="px-1 font-medium">Sort by</p>
            <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortValue)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="best">Best match</SelectItem>
                <SelectItem value="newest">Newest</SelectItem>
                <SelectItem value="closest">Closest</SelectItem>
                <SelectItem value="pay">Salary</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            {hasFilters && (
              <Button variant="ghost" onClick={clearFilters}>
                Clear all
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Desktop page header ── */}
      <div className="hidden shrink-0 items-center justify-between gap-4 py-5 md:flex">
        <h1 className="text-2xl font-semibold">Job Listings</h1>
        {session?.user?.role === "EMPLOYER" && (
          <Button asChild>
            <Link href="/employer/jobs/new">Post a Job</Link>
          </Button>
        )}
      </div>

      {/* ── Layout: sidebar + list ── */}
      <div className="flex flex-col gap-6 pt-5 md:flex-1 md:flex-row md:overflow-hidden md:pt-0">
        {/* Desktop sidebar — sticky */}
        <aside className="hidden w-52 shrink-0 space-y-5 md:block md:overflow-y-auto md:pb-8">
          <div className="relative w-52">
            <SearchIcon className="text-popover absolute top-1/2 left-2 size-4 -translate-y-1/2" />

            <Input
              variant="secondary"
              placeholder="Search jobs…"
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="placeholder-popover/80 pr-8 pl-8"
            />

            {searchQuery && (
              <button
                type="button"
                onClick={clearSearch}
                className="text-popover absolute top-1/2 right-2.5 -translate-y-1/2 transition-colors duration-150"
              >
                <XIcon className="size-3.5" />
              </button>
            )}
          </div>

          {/* Location */}
          <div>
            <div className="flex justify-between">
              <p className="mb-1.5 px-1 text-sm font-medium">Location</p>
              {countText && <p className="mb-3 hidden text-sm md:block">{countText}</p>}
            </div>
            <div className="space-y-3">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <FilterTrigger className="w-full justify-between">
                    {stateAbbr
                      ? `${stateAbbr} — ${states.find((s) => s.abbr === stateAbbr)?.name ?? stateAbbr}`
                      : "State"}
                  </FilterTrigger>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="max-h-64 overflow-y-auto whitespace-nowrap">
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
                <DropdownMenuContent className="max-h-64 overflow-y-auto">
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
                <DropdownMenuContent>
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
            <p className="mb-1.5 px-1 text-sm font-medium">Filters</p>
            <div className="space-y-3">
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
                <DropdownMenuContent>
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
                <DropdownMenuContent>
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
                <DropdownMenuContent>
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
            </div>
          </div>

          {/* Sort */}
          <div>
            <p className="mb-1.5 px-1 text-sm font-medium">Sort by</p>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <FilterTrigger className="w-full justify-between">
                  {SORT_LABELS[sortBy]}
                </FilterTrigger>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuRadioGroup
                  value={sortBy}
                  onValueChange={(v) => setSortBy(v as SortValue)}
                >
                  <DropdownMenuRadioItem value="best">Best match</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="newest">Newest</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="closest">Closest</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="pay">Salary</DropdownMenuRadioItem>
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {hasFilters && (
            <Button onClick={clearFilters} className="w-full">
              Clear filters
            </Button>
          )}
        </aside>

        {/* ── Jobs list ── */}
        <div className="min-w-0 flex-1 pb-8 md:overflow-y-auto">
          {isLoading && (
            <div className="text-muted-foreground py-16 text-center">Loading listings…</div>
          )}

          {!isLoading && queryError && (
            <div className="py-16 text-center">
              <p className="text-destructive text-sm">
                Something went wrong loading jobs. Please try again.
              </p>
            </div>
          )}

          {!isLoading && !queryError && displayJobs !== undefined && displayJobs.length === 0 && (
            <div className="py-16 text-center">
              <p className="text-muted-foreground text-sm">
                {isSearchMode
                  ? `No results for "${debouncedQuery}"`
                  : hasFilters
                    ? "No jobs match your filters."
                    : "No open positions yet. Check back soon."}
              </p>
            </div>
          )}

          {!isLoading && !queryError && displayJobs && displayJobs.length > 0 && (
            <div className="space-y-3">
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
                  status={job.status as "ACTIVE" | "PAUSED" | "CLOSED"}
                  companyName={job.company.name}
                  href={`/jobs/${job.id}`}
                  applicationCount={job._count.applications}
                />
              ))}
            </div>
          )}
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
