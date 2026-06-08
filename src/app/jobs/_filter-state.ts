// Pure, DOM-free logic for the jobs search/filter page. Extracted from page.tsx
// so it can be unit-tested without React. The component owns all useState /
// useEffect / tRPC wiring; everything here is a plain function or constant.

export type ArrangementValue = "ON_SITE" | "REMOTE" | "HYBRID";
export type DayValue = "SUN" | "MON" | "TUE" | "WED" | "THU" | "FRI" | "SAT";
export type SortValue = "best" | "newest" | "closest" | "pay";

export const ARRANGEMENT_OPTIONS: { value: ArrangementValue; label: string }[] = [
  { value: "ON_SITE", label: "On-site" },
  { value: "REMOTE", label: "Remote" },
  { value: "HYBRID", label: "Hybrid" },
];

export const DAY_OPTIONS: { value: DayValue; label: string }[] = [
  { value: "SUN", label: "Sunday" },
  { value: "MON", label: "Monday" },
  { value: "TUE", label: "Tuesday" },
  { value: "WED", label: "Wednesday" },
  { value: "THU", label: "Thursday" },
  { value: "FRI", label: "Friday" },
  { value: "SAT", label: "Saturday" },
];

export const RADIUS_OPTIONS = [
  { value: "5", label: "Within 5 miles" },
  { value: "10", label: "Within 10 miles" },
  { value: "25", label: "Within 25 miles" },
  { value: "50", label: "Within 50 miles" },
  { value: "100", label: "Within 100 miles" },
];

export const SORT_LABELS: Record<SortValue, string> = {
  best: "Best match",
  newest: "Newest",
  closest: "Closest",
  pay: "Salary",
};

export const FILTER_KEY = "jobs_params";

/** The full filter state, as parsed from / serialized to URL search params. */
export type Filters = {
  q: string;
  stateAbbr: string;
  city: string;
  radius: string;
  jobType: string;
  arrangements: ArrangementValue[];
  workDays: DayValue[];
  sortBy: SortValue;
};

/**
 * Squared planar approximation of the distance between two lat/lon points.
 * Good enough for ordering nearby jobs; not a true geodesic distance.
 */
export function approxDistanceSq(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const dx = (lon2 - lon1) * Math.cos((lat1 * Math.PI) / 180);
  const dy = lat2 - lat1;
  return dx * dx + dy * dy;
}

/** Add `item` if absent, remove it if present. */
export function toggleItem<T>(arr: T[], item: T): T[] {
  return arr.includes(item) ? arr.filter((x) => x !== item) : [...arr, item];
}

/** Resolve the sort param, defaulting to "best" when a text query is present, else "newest". */
export function parseSortParam(value: string | null, hasQuery: boolean): SortValue {
  if (value === "best" || value === "newest" || value === "closest" || value === "pay") {
    return value;
  }
  return hasQuery ? "best" : "newest";
}

type SortableJob = {
  minHourlyRate: string | number;
  createdAt: string | number | Date;
  lat: number | null;
  lon: number | null;
};

/**
 * Sort a job list according to the active sort mode and cap it at 50 items.
 * "best" (and "closest" without a reference city) preserve the incoming order.
 */
export function sortJobs<T extends SortableJob>(
  jobs: T[],
  sortBy: SortValue,
  refCity: { lat: number; lon: number } | null,
): T[] {
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
}

/** Parse a complete filter state out of URL search params (used on mount and restore). */
export function readFiltersFromParams(params: URLSearchParams): Filters {
  const arrangements = params.get("arrangements");
  const days = params.get("days");
  return {
    q: params.get("q") ?? "",
    stateAbbr: params.get("state") ?? "",
    city: params.get("city") ?? "",
    radius: params.get("radius") ?? "any",
    jobType: params.get("jobType") ?? "any",
    arrangements: arrangements
      ? (arrangements.split(",").filter(Boolean) as ArrangementValue[])
      : [],
    workDays: days ? (days.split(",").filter(Boolean) as DayValue[]) : [],
    sortBy: parseSortParam(params.get("sortBy"), !!params.get("q")),
  };
}

/**
 * Serialize a full filter state to canonical URL search params, omitting values
 * that equal their default (so a clean state produces an empty querystring).
 */
export function filtersToSearchParams(f: Filters): URLSearchParams {
  const params = new URLSearchParams();
  if (f.q) params.set("q", f.q);
  if (f.stateAbbr) params.set("state", f.stateAbbr);
  if (f.city) params.set("city", f.city);
  if (f.radius !== "any") params.set("radius", f.radius);
  if (f.jobType !== "any") params.set("jobType", f.jobType);
  if (f.arrangements.length) params.set("arrangements", f.arrangements.join(","));
  if (f.workDays.length) params.set("days", f.workDays.join(","));
  if (f.sortBy !== "newest") params.set("sortBy", f.sortBy);
  return params;
}

type FilterDerivationInput = Pick<
  Filters,
  "q" | "stateAbbr" | "city" | "radius" | "jobType" | "arrangements" | "workDays"
>;

/** Whether any search/filter is currently narrowing the results. */
export function hasActiveFilters(f: FilterDerivationInput): boolean {
  return (
    !!f.q ||
    !!f.city ||
    !!f.stateAbbr ||
    f.radius !== "any" ||
    f.jobType !== "any" ||
    f.arrangements.length > 0 ||
    f.workDays.length > 0
  );
}

/** Count of active filter *groups*, for the mobile filter badge. */
export function activeFilterCount(f: FilterDerivationInput): number {
  return [
    !!f.q,
    !!f.stateAbbr || !!f.city,
    f.radius !== "any",
    f.jobType !== "any",
    f.arrangements.length > 0,
    f.workDays.length > 0,
  ].filter(Boolean).length;
}
