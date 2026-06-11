"use client";

import { useState, useEffect, useRef, useMemo, useCallback, Suspense } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { trpc } from "@/lib/trpc/provider";
import { Button } from "@/components/ui/button";
import { JobCard } from "@/components/ui/job-card";
import { MobileFilterBar, DesktopFilterSidebar } from "@/app/jobs/_filter-panel";
import {
  type ArrangementValue,
  type DayValue,
  type SortValue,
  type Filters,
  FILTER_KEY,
  parseSortParam,
  sortJobs,
  readFiltersFromParams,
  filtersToSearchParams,
  hasActiveFilters,
  activeFilterCount as computeActiveFilterCount,
} from "@/app/jobs/_filter-state";

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
    const saved = readFiltersFromParams(new URLSearchParams(savedQS));
    setStateAbbrState(saved.stateAbbr);
    setCityState(saved.city);
    setRadiusState(saved.radius);
    setJobTypeState(saved.jobType);
    setArrangementsState(saved.arrangements);
    setWorkDaysState(saved.workDays);
    setSortByState(saved.sortBy);
    if (saved.q) {
      setSearchQuery(saved.q);
      setDebouncedQuery(saved.q);
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
    return sortJobs(jobs, sortBy, refCity);
  }, [searchResults, listResults, isSearchMode, sortBy, refCity]);

  const filterState = { q: searchQuery, stateAbbr, city, radius, jobType, arrangements, workDays };
  const hasFilters = hasActiveFilters(filterState);
  const activeFilterCount = computeActiveFilterCount(filterState);

  function clearFilters() {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    sessionStorage.removeItem(FILTER_KEY);
    const hasProfileLocation = !!(profileCity && profileState);
    const cleared: Filters = {
      q: "",
      stateAbbr: hasProfileLocation ? (profileState ?? "") : "",
      city: hasProfileLocation ? (profileCity ?? "") : "",
      radius: hasProfileLocation ? "25" : "any",
      jobType: "any",
      arrangements: [],
      workDays: [],
      sortBy: "newest",
    };
    setSearchQuery(cleared.q);
    setDebouncedQuery(cleared.q);
    setStateAbbrState(cleared.stateAbbr);
    setCityState(cleared.city);
    setRadiusState(cleared.radius);
    setJobTypeState(cleared.jobType);
    setArrangementsState(cleared.arrangements);
    setWorkDaysState(cleared.workDays);
    setSortByState(cleared.sortBy);
    const qs = filtersToSearchParams(cleared).toString();
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

  const filterProps = {
    searchQuery,
    stateAbbr,
    city,
    radius,
    jobType,
    arrangements,
    workDays,
    sortBy,
    filterOpen,
    states,
    cities,
    countText,
    activeFilterCount,
    hasFilters,
    jobCount: displayJobs?.length,
    isLoading,
    isEmployer: session?.user?.role === "EMPLOYER",
    onFilterOpenChange: setFilterOpen,
    onSearchChange: handleSearchChange,
    onClearSearch: clearSearch,
    onStateChange: setStateAbbr,
    onCityChange: setCity,
    onRadiusChange: setRadius,
    onJobTypeChange: setJobType,
    onArrangementsChange: setArrangements,
    onWorkDaysChange: setWorkDays,
    onSortChange: setSortBy,
    onClearFilters: clearFilters,
  };

  return (
    <div className="mx-auto max-w-4xl px-4 md:flex md:h-[calc(100vh-4rem)] md:flex-col">
      <MobileFilterBar {...filterProps} />

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
        <DesktopFilterSidebar {...filterProps} />

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
