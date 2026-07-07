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
  SCROLL_KEY,
  parseSortParam,
  sortJobs,
  radiusOptions,
  readFiltersFromParams,
  filtersToSearchParams,
  hasActiveFilters,
  activeFilterCount as computeActiveFilterCount,
} from "@/app/jobs/_filter-state";
import { COUNTRY_CONFIG, isCountryCode, type CountryCode } from "@/lib/constants/countries";
import { pluralize } from "@/lib/utils";

function JobsContent() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const { data: session } = useSession();

  const [country, setCountryState] = useState(() => searchParams.get("country") ?? "");
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

  // The list scrolls inside its own container on desktop but scrolls the window on
  // mobile, so neither the browser's native scroll restoration nor a single scrollY
  // reliably covers both — we persist and restore both positions ourselves.
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const scrollRestored = useRef(false);
  const navigatingAway = useRef(false);

  const countryConfigOrNull = isCountryCode(country) ? COUNTRY_CONFIG[country] : null;

  const { data: states = [] } = trpc.location.states.useQuery(
    { country: country as CountryCode },
    { enabled: isCountryCode(country) && !countryConfigOrNull?.flat },
  );
  const { data: cities = [] } = trpc.location.citiesByState.useQuery(
    { country: country as CountryCode, stateAbbr },
    { enabled: isCountryCode(country) && !!stateAbbr },
  );

  const { data: seekerProfile } = trpc.seeker.getMyProfile.useQuery(undefined, {
    enabled: session?.user?.role === "SEEKER",
  });
  const { data: myBusinesses } = trpc.business.listMine.useQuery(undefined, {
    enabled: session?.user?.role === "EMPLOYER",
  });
  const employerProfile = myBusinesses?.[0];

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

  function setCountry(val: string) {
    // Flat countries (Israel) have no region dropdown; store their fixed region code so
    // the city query still resolves. Region-based countries reset to an empty region.
    const cfg = isCountryCode(val) ? COUNTRY_CONFIG[val] : null;
    const nextState = cfg?.flat ? (cfg.flatRegionCode ?? "") : "";
    setCountryState(val);
    setStateAbbrState(nextState);
    setCityState("");
    setRadiusState("any");
    updateParams({
      country: val || null,
      state: nextState || null,
      city: null,
      radius: null,
    });
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

  const profileCountry = seekerProfile?.country ?? employerProfile?.country;
  const profileCity = seekerProfile?.city ?? employerProfile?.city;
  const profileState = seekerProfile?.state ?? employerProfile?.state;

  // On mount: if URL has no params, restore all filters from sessionStorage.
  // Runs before the profile-init effect so it can set locationInitialized first.
  useEffect(() => {
    if (searchParamsRef.current.get("country") || searchParamsRef.current.get("state")) {
      locationInitialized.current = true;
      return;
    }
    const savedQS = sessionStorage.getItem(FILTER_KEY);
    if (!savedQS) return;
    const saved = readFiltersFromParams(new URLSearchParams(savedQS));
    setCountryState(saved.country);
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

  // Continuously persist scroll position so it survives navigating to a job detail
  // page and back — neither the container div's scrollTop nor window.scrollY is
  // restored natively (the container isn't the document, and the page remounts).
  //
  // Next.js resets window.scrollTo(0, 0) while this page is still mounted and
  // transitioning to the job detail route, which would otherwise be caught by this
  // same scroll listener and clobber the real position with 0. navigatingAway stops
  // that — it's set by saveScrollNow, called from JobCard right before it navigates,
  // which also captures the real position before Next's reset can happen.
  const saveScrollNow = useCallback(() => {
    navigatingAway.current = true;
    sessionStorage.setItem(
      SCROLL_KEY,
      JSON.stringify({
        search: searchParamsRef.current.toString(),
        container: scrollContainerRef.current?.scrollTop ?? 0,
        window: window.scrollY,
      }),
    );
  }, []);

  useEffect(() => {
    const container = scrollContainerRef.current;
    let ticking = false;
    let lastSave = 0;
    const save = () => {
      ticking = false;
      if (navigatingAway.current) return;
      const now = performance.now();
      if (now - lastSave < 25) return; // cap writes to ~40/sec
      lastSave = now;
      sessionStorage.setItem(
        SCROLL_KEY,
        JSON.stringify({
          search: searchParamsRef.current.toString(),
          container: container?.scrollTop ?? 0,
          window: window.scrollY,
        }),
      );
    };
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(save);
    };
    container?.addEventListener("scroll", onScroll);
    window.addEventListener("scroll", onScroll);
    return () => {
      container?.removeEventListener("scroll", onScroll);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  // First-time setup: auto-fill location from user profile when no URL params
  // and no sessionStorage data exists.
  useEffect(() => {
    if (locationInitialized.current) return;
    if (searchParamsRef.current.get("country") || searchParamsRef.current.get("state")) {
      locationInitialized.current = true;
      return;
    }
    if (!profileCountry || !profileCity || !profileState) return;

    setCountryState(profileCountry);
    setStateAbbrState(profileState);
    setCityState(profileCity);
    setRadiusState("25");

    const params = new URLSearchParams(searchParamsRef.current.toString());
    params.set("country", profileCountry);
    params.set("state", profileState);
    params.set("city", profileCity);
    params.set("radius", "25");
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });

    locationInitialized.current = true;
  }, [profileCountry, profileCity, profileState, pathname, router]);

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
    country: isCountryCode(country) ? country : undefined,
    city: city || undefined,
    state: stateAbbr || undefined,
    radius: radius !== "any" ? Number(radius) : undefined,
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

  // Restore scroll position once the list has actual content to scroll through.
  // The double rAF waits for React to commit and the browser to paint, so the
  // container has its real scrollable height before we set scrollTop.
  useEffect(() => {
    if (isLoading || displayJobs === undefined || scrollRestored.current) return;
    scrollRestored.current = true;

    const raw = sessionStorage.getItem(SCROLL_KEY);
    if (!raw) return;
    const saved = JSON.parse(raw) as { search: string; container: number; window: number };
    if (saved.search !== searchParams.toString()) return;

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (scrollContainerRef.current) scrollContainerRef.current.scrollTop = saved.container;
        window.scrollTo(0, saved.window);
      });
    });
  }, [isLoading, displayJobs, searchParams]);

  // When a distance radius is active, split results into nearby (on-site/hybrid) jobs and
  // the distance-exempt remote jobs, which render below a divider. Search mode and the
  // no-radius browse stay a single list.
  const radiusActive = radius !== "any" && !!city && !isSearchMode;
  const { localJobs, remoteJobs } = useMemo((): {
    localJobs: NonNullable<typeof displayJobs> | undefined;
    remoteJobs: NonNullable<typeof displayJobs>;
  } => {
    if (!displayJobs) return { localJobs: undefined, remoteJobs: [] };
    if (!radiusActive) return { localJobs: displayJobs, remoteJobs: [] };
    return {
      localJobs: displayJobs.filter((j) => j.workArrangement !== "REMOTE"),
      remoteJobs: displayJobs.filter((j) => j.workArrangement === "REMOTE"),
    };
  }, [displayJobs, radiusActive]);

  const filterState = {
    q: searchQuery,
    country,
    stateAbbr,
    city,
    radius,
    jobType,
    arrangements,
    workDays,
  };
  const hasFilters = hasActiveFilters(filterState);
  const activeFilterCount = computeActiveFilterCount(filterState);

  function clearFilters() {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    sessionStorage.removeItem(FILTER_KEY);
    const hasProfileLocation = !!(profileCountry && profileCity && profileState);
    const cleared: Filters = {
      q: "",
      country: hasProfileLocation ? (profileCountry ?? "") : "",
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
    setCountryState(cleared.country);
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
          : `${pluralize(displayJobs.length, "result")} for "${debouncedQuery}"`
        : displayJobs.length === 0
          ? null
          : `${pluralize(displayJobs.length, "job")} found`
      : null;

  const filterProps = {
    searchQuery,
    country,
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
    radiusOptions: radiusOptions(country),
    regionLabel: countryConfigOrNull?.regionLabel ?? "State",
    showRegion: isCountryCode(country) && !countryConfigOrNull?.flat,
    countText,
    activeFilterCount,
    hasFilters,
    jobCount: displayJobs?.length,
    isLoading,
    isEmployer: session?.user?.role === "EMPLOYER",
    onFilterOpenChange: setFilterOpen,
    onSearchChange: handleSearchChange,
    onClearSearch: clearSearch,
    onCountryChange: setCountry,
    onStateChange: setStateAbbr,
    onCityChange: setCity,
    onRadiusChange: setRadius,
    onJobTypeChange: setJobType,
    onArrangementsChange: setArrangements,
    onWorkDaysChange: setWorkDays,
    onSortChange: setSortBy,
    onClearFilters: clearFilters,
  };

  const renderJobCard = (job: NonNullable<typeof displayJobs>[number]) => (
    <JobCard
      key={job.id}
      id={job.id}
      title={job.title}
      country={job.country}
      city={job.city}
      state={job.state}
      jobType={job.jobType}
      workArrangement={job.workArrangement}
      minHourlyRate={Number(job.minHourlyRate)}
      status={job.status as "ACTIVE" | "PAUSED" | "CLOSED"}
      businessName={job.business.name}
      href={`/jobs/${job.id}`}
      applicationCount={job._count.applications}
      onNavigate={saveScrollNow}
    />
  );

  return (
    <div className="md:p-5">
      <div className="mx-auto max-w-4xl px-5 md:flex md:h-[calc(100vh-7rem)] md:flex-col md:px-0 md:pl-1">
        <MobileFilterBar {...filterProps} />

        {/* ── Desktop page header ── */}
        <div className="hidden shrink-0 items-center justify-between gap-4 pl-1.5 md:flex">
          <h1 className="text-2xl font-semibold">Job Listings</h1>
          {session?.user?.role === "EMPLOYER" && (
            <Button asChild>
              <Link href="/employer/jobs/new">Post a Job</Link>
            </Button>
          )}
        </div>

        {/* ── Layout: sidebar + list ── */}
        <div className="flex flex-col gap-6 pt-5 md:min-h-0 md:flex-1 md:flex-row">
          <DesktopFilterSidebar {...filterProps} />

          {/* ── Jobs list ── */}
          <div
            ref={scrollContainerRef}
            className="min-w-0 flex-1 pb-8 md:-ml-2 md:overflow-y-auto md:pl-2"
          >
            {isLoading && <div className="py-16 text-center">Loading listings…</div>}

            {!isLoading && queryError && (
              <div className="py-16 text-center">
                <p className="text-destructive text-sm">
                  Something went wrong loading jobs. Please try again.
                </p>
              </div>
            )}

            {!isLoading && !queryError && displayJobs !== undefined && displayJobs.length === 0 && (
              <div className="py-16 text-center">
                <p className="text-sm">
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
                {(localJobs ?? displayJobs).map(renderJobCard)}

                {/* Remote jobs are distance-exempt: when a radius narrows the local list,
                    they appear below this divider instead of being filtered out. The
                    divider only shows when there are local results above it. */}
                {radiusActive && remoteJobs.length > 0 && (localJobs?.length ?? 0) > 0 && (
                  <div className="flex items-center gap-3 pt-4 pb-1">
                    <span className="bg-primary/20 h-px flex-1" />
                    <span className="text-sm font-medium">
                      Continue scrolling for remote positions
                    </span>
                    <span className="bg-primary/20 h-px flex-1" />
                  </div>
                )}
                {radiusActive && remoteJobs.map(renderJobCard)}
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
