import { describe, it, expect, vi, beforeEach } from "vitest";
import { TRPCError } from "@trpc/server";
import { createCallerFactory } from "@/server/api/trpc";
import { locationRouter } from "../location";

vi.mock("@/db", () => ({ db: {} }));
vi.mock("@/auth", () => ({ auth: vi.fn() }));

// The `states` query is select().from().where().orderBy(); `citiesByState` is
// select().from().innerJoin().where().orderBy(). We capture the terminal orderBy result.
function makeMockDb(rows: unknown[] = []) {
  const orderBy = vi.fn().mockResolvedValue(rows);
  const where = vi.fn().mockReturnValue({ orderBy });
  const innerJoin = vi.fn().mockReturnValue({ where });
  const from = vi.fn().mockReturnValue({ where, innerJoin });
  const select = vi.fn().mockReturnValue({ from });
  return { db: { select }, spies: { select, from, innerJoin, where, orderBy } };
}

function makeCtx(db: unknown) {
  return {
    headers: new Headers(),
    session: null,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    db: db as any,
  };
}

const createCaller = createCallerFactory(locationRouter);

describe("location.states", () => {
  let mock: ReturnType<typeof makeMockDb>;

  beforeEach(() => {
    mock = makeMockDb([{ abbr: "NY", name: "New York", lat: 40.7, lon: -74 }]);
  });

  it("returns states for the requested country", async () => {
    const caller = createCaller(makeCtx(mock.db));
    const result = await caller.states({ country: "US" });
    expect(result).toEqual([{ abbr: "NY", name: "New York", lat: 40.7, lon: -74 }]);
    // Country scoping must be applied.
    expect(mock.spies.where).toHaveBeenCalled();
  });

  it("accepts Israel as a country", async () => {
    const caller = createCaller(makeCtx(mock.db));
    await expect(caller.states({ country: "IL" })).resolves.toBeDefined();
  });

  it("rejects an unsupported country", async () => {
    const caller = createCaller(makeCtx(mock.db));
    // @ts-expect-error invalid country
    await expect(caller.states({ country: "GB" })).rejects.toThrow(TRPCError);
  });
});

describe("location.citiesByState", () => {
  let mock: ReturnType<typeof makeMockDb>;

  beforeEach(() => {
    mock = makeMockDb([{ name: "Tel Aviv", lat: 32.08, lon: 34.78 }]);
  });

  it("returns cities scoped by country + state (flat IL region code)", async () => {
    const caller = createCaller(makeCtx(mock.db));
    const result = await caller.citiesByState({ country: "IL", stateAbbr: "IL" });
    expect(result).toEqual([{ name: "Tel Aviv", lat: 32.08, lon: 34.78 }]);
    expect(mock.spies.innerJoin).toHaveBeenCalled();
  });

  it("allows region codes longer than the old US 2-char limit", async () => {
    const caller = createCaller(makeCtx(mock.db));
    await expect(caller.citiesByState({ country: "US", stateAbbr: "CA" })).resolves.toBeDefined();
    await expect(caller.citiesByState({ country: "IL", stateAbbr: "IL" })).resolves.toBeDefined();
  });

  it("rejects an empty state abbr", async () => {
    const caller = createCaller(makeCtx(mock.db));
    await expect(caller.citiesByState({ country: "US", stateAbbr: "" })).rejects.toThrow(TRPCError);
  });
});
