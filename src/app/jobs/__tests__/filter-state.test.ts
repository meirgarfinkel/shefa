import { describe, it, expect } from "vitest";
import {
  approxDistanceSq,
  toggleItem,
  parseSortParam,
  sortJobs,
  readFiltersFromParams,
  filtersToSearchParams,
  hasActiveFilters,
  activeFilterCount,
  type Filters,
} from "@/app/jobs/_filter-state";

const emptyFilters: Filters = {
  q: "",
  stateAbbr: "",
  city: "",
  radius: "any",
  jobType: "any",
  arrangements: [],
  workDays: [],
  sortBy: "newest",
};

describe("approxDistanceSq", () => {
  it("is zero for identical points", () => {
    expect(approxDistanceSq(40, -74, 40, -74)).toBe(0);
  });

  it("grows with separation", () => {
    const near = approxDistanceSq(40, -74, 40.1, -74);
    const far = approxDistanceSq(40, -74, 41, -74);
    expect(far).toBeGreaterThan(near);
  });
});

describe("toggleItem", () => {
  it("adds an absent item", () => {
    expect(toggleItem(["A"], "B")).toEqual(["A", "B"]);
  });
  it("removes a present item", () => {
    expect(toggleItem(["A", "B"], "A")).toEqual(["B"]);
  });
});

describe("parseSortParam", () => {
  it("passes through valid values", () => {
    for (const v of ["best", "newest", "closest", "pay"] as const) {
      expect(parseSortParam(v, false)).toBe(v);
    }
  });
  it("defaults to best when a query is present", () => {
    expect(parseSortParam(null, true)).toBe("best");
    expect(parseSortParam("garbage", true)).toBe("best");
  });
  it("defaults to newest with no query", () => {
    expect(parseSortParam(null, false)).toBe("newest");
  });
});

describe("sortJobs", () => {
  const job = (over: Partial<Parameters<typeof sortJobs>[0][number]> & { id: string }) => ({
    id: over.id,
    minHourlyRate: over.minHourlyRate ?? 0,
    createdAt: over.createdAt ?? "2024-01-01",
    lat: over.lat ?? null,
    lon: over.lon ?? null,
  });

  it("sorts by pay descending", () => {
    const out = sortJobs(
      [job({ id: "a", minHourlyRate: "15" }), job({ id: "b", minHourlyRate: 30 })],
      "pay",
      null,
    );
    expect(out.map((j) => j.id)).toEqual(["b", "a"]);
  });

  it("sorts by newest descending", () => {
    const out = sortJobs(
      [job({ id: "old", createdAt: "2020-01-01" }), job({ id: "new", createdAt: "2024-06-01" })],
      "newest",
      null,
    );
    expect(out.map((j) => j.id)).toEqual(["new", "old"]);
  });

  it("sorts by closest when a reference city is given", () => {
    const out = sortJobs(
      [job({ id: "far", lat: 50, lon: -74 }), job({ id: "near", lat: 40.1, lon: -74 })],
      "closest",
      { lat: 40, lon: -74 },
    );
    expect(out.map((j) => j.id)).toEqual(["near", "far"]);
  });

  it("pushes jobs with no coordinates to the end when sorting by closest", () => {
    const out = sortJobs(
      [job({ id: "nocoords" }), job({ id: "near", lat: 40.1, lon: -74 })],
      "closest",
      { lat: 40, lon: -74 },
    );
    expect(out.map((j) => j.id)).toEqual(["near", "nocoords"]);
  });

  it("preserves order for closest without a reference city", () => {
    const out = sortJobs([job({ id: "a" }), job({ id: "b" })], "closest", null);
    expect(out.map((j) => j.id)).toEqual(["a", "b"]);
  });

  it("preserves order for best", () => {
    const out = sortJobs([job({ id: "a" }), job({ id: "b" })], "best", null);
    expect(out.map((j) => j.id)).toEqual(["a", "b"]);
  });

  it("caps the result at 50", () => {
    const many = Array.from({ length: 80 }, (_, i) => job({ id: String(i) }));
    expect(sortJobs(many, "best", null)).toHaveLength(50);
  });

  it("does not mutate the input array", () => {
    const input = [job({ id: "a", minHourlyRate: 1 }), job({ id: "b", minHourlyRate: 2 })];
    sortJobs(input, "pay", null);
    expect(input.map((j) => j.id)).toEqual(["a", "b"]);
  });
});

describe("readFiltersFromParams", () => {
  it("returns defaults for empty params", () => {
    expect(readFiltersFromParams(new URLSearchParams())).toEqual(emptyFilters);
  });

  it("parses multi-value and scalar params", () => {
    const f = readFiltersFromParams(
      new URLSearchParams(
        "q=cook&state=NY&city=Albany&radius=25&jobType=FULL_TIME&arrangements=REMOTE,HYBRID&days=MON,TUE",
      ),
    );
    expect(f).toEqual({
      q: "cook",
      stateAbbr: "NY",
      city: "Albany",
      radius: "25",
      jobType: "FULL_TIME",
      arrangements: ["REMOTE", "HYBRID"],
      workDays: ["MON", "TUE"],
      sortBy: "best", // q present, no explicit sortBy
    });
  });
});

describe("filtersToSearchParams", () => {
  it("emits an empty querystring for default filters", () => {
    expect(filtersToSearchParams(emptyFilters).toString()).toBe("");
  });

  it("omits default-valued fields and round-trips the rest", () => {
    const f: Filters = {
      ...emptyFilters,
      stateAbbr: "NY",
      city: "Albany",
      radius: "25",
      arrangements: ["REMOTE"],
      sortBy: "pay",
    };
    const round = readFiltersFromParams(filtersToSearchParams(f));
    expect(round).toEqual({ ...f, sortBy: "pay" });
  });
});

describe("hasActiveFilters / activeFilterCount", () => {
  it("is inactive for empty filters", () => {
    expect(hasActiveFilters(emptyFilters)).toBe(false);
    expect(activeFilterCount(emptyFilters)).toBe(0);
  });

  it("counts state and city as one group", () => {
    expect(activeFilterCount({ ...emptyFilters, stateAbbr: "NY", city: "Albany" })).toBe(1);
  });

  it("counts independent groups separately", () => {
    const f: Filters = {
      ...emptyFilters,
      q: "cook",
      stateAbbr: "NY",
      radius: "25",
      jobType: "FULL_TIME",
      arrangements: ["REMOTE"],
      workDays: ["MON"],
    };
    expect(hasActiveFilters(f)).toBe(true);
    expect(activeFilterCount(f)).toBe(6);
  });
});
