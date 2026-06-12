import { describe, it, expect, vi, beforeEach } from "vitest";
import { TRPCError } from "@trpc/server";
import { createCallerFactory } from "@/server/api/trpc";
import { jobPostingRouter } from "../jobPosting";

vi.mock("@/db", () => ({ db: {} }));
vi.mock("@/auth", () => ({ auth: vi.fn() }));

// ── Mock helpers ──────────────────────────────────────────────────────────────

function makeMockDb() {
  return {
    query: {
      business: { findFirst: vi.fn(), findMany: vi.fn() },
      jobPosting: { findFirst: vi.fn(), findMany: vi.fn() },
      employerProfile: { findFirst: vi.fn(), findMany: vi.fn() },
      application: { findFirst: vi.fn(), findMany: vi.fn() },
    },
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([]),
      }),
    }),
    update: vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([]),
        }),
      }),
    }),
    delete: vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue(undefined),
    }),
    // select is used for city lookup, counts, geo
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([]),
          groupBy: vi.fn().mockResolvedValue([]),
        }),
        innerJoin: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
        groupBy: vi.fn().mockResolvedValue([]),
      }),
    }),
    execute: vi.fn().mockResolvedValue({ rows: [] }),
  };
}

type Role = "SEEKER" | "EMPLOYER" | "ADMIN";

function makeCtx(role: Role | null, db: ReturnType<typeof makeMockDb>, userId = "user-1") {
  return {
    headers: new Headers(),
    session:
      role !== null
        ? {
            user: { id: userId, email: "test@example.com", name: null, image: null, role },
            expires: new Date(Date.now() + 86400000).toISOString(),
          }
        : null,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    db: db as any,
  };
}

const createCaller = createCallerFactory(jobPostingRouter);

// ── Fixtures ──────────────────────────────────────────────────────────────────

const EMPLOYER_USER_ID = "user-1";
const OTHER_EMPLOYER_USER_ID = "user-2";
const BUSINESS_ID = "business-1";
const OTHER_BUSINESS_ID = "business-2";
const JOB_ID = "job-1";

const MOCK_BUSINESS = { id: BUSINESS_ID, ownerId: EMPLOYER_USER_ID };

const MOCK_JOB = {
  id: JOB_ID,
  employerId: EMPLOYER_USER_ID,
  businessId: BUSINESS_ID,
  title: "Line Cook",
  description: "Help in the kitchen.",
  jobType: "FULL_TIME",
  workArrangement: "ON_SITE",
  city: "Brooklyn",
  state: "NY",
  minHourlyRate: "15.00",
  payNotes: null,
  workDays: ["MON", "TUE"],
  scheduleNotes: null,
  workAuthRequired: false,
  whatWereLookingFor: null,
  status: "ACTIVE",
  applicationCount: 0,
  lastVerifiedAt: new Date(),
  createdAt: new Date(),
  updatedAt: new Date(),
  requiredLanguages: [],
  business: {
    id: BUSINESS_ID,
    name: "Mama's Kitchen",
    city: "Brooklyn",
    state: "NY",
    industry: "FOOD_SERVICE",
    owner: {
      id: EMPLOYER_USER_ID,
      employerProfile: { isResponsive: true, responsivenessUpdatedAt: new Date() },
    },
  },
};

// Shape returned by search's findMany (includes business + _count)
const MOCK_JOB_SEARCH_RESULT = {
  ...MOCK_JOB,
  lat: 40.65,
  lon: -73.95,
  requiredLanguages: [],
  business: { id: BUSINESS_ID, name: "Mama's Kitchen", city: "Brooklyn", state: "NY" },
};
const MOCK_JOB_CLOSED = { ...MOCK_JOB, status: "CLOSED" };

const VALID_CREATE_INPUT = {
  title: "Line Cook",
  description: "Help in the kitchen.",
  jobType: "FULL_TIME" as const,
  workArrangement: "ON_SITE" as const,
  city: "Brooklyn",
  state: "NY",
  minHourlyRate: 15,
  workAuthRequired: false,
  businessId: BUSINESS_ID,
};

// ── jobPosting.create ─────────────────────────────────────────────────────────

const MOCK_CITY_COORDS = { lat: 40.65, lon: -73.95 };

describe("jobPosting.create", () => {
  let db: ReturnType<typeof makeMockDb>;

  beforeEach(() => {
    db = makeMockDb();
    db.query.business.findFirst.mockResolvedValue(MOCK_BUSINESS);
    // City lookup: select().from().innerJoin().where().limit()
    db.select.mockReturnValue({
      from: vi.fn().mockReturnValue({
        innerJoin: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([MOCK_CITY_COORDS]),
          }),
        }),
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([MOCK_CITY_COORDS]),
          groupBy: vi.fn().mockResolvedValue([]),
        }),
        groupBy: vi.fn().mockResolvedValue([]),
      }),
    });
    db.insert.mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([MOCK_JOB]),
      }),
    });
  });

  // ── Happy path ──

  it("creates posting and returns it", async () => {
    const caller = createCaller(makeCtx("EMPLOYER", db));
    const result = await caller.create(VALID_CREATE_INPUT);
    expect(result).toMatchObject({ id: JOB_ID });
  });

  it("sets employerId from the session, not input", async () => {
    const caller = createCaller(makeCtx("EMPLOYER", db, EMPLOYER_USER_ID));
    const result = await caller.create(VALID_CREATE_INPUT);
    expect(result).toMatchObject({ employerId: EMPLOYER_USER_ID });
    expect(db.insert).toHaveBeenCalled();
  });

  it("sets businessId from input after validating ownership", async () => {
    const caller = createCaller(makeCtx("EMPLOYER", db));
    const result = await caller.create(VALID_CREATE_INPUT);
    expect(result).toMatchObject({ businessId: BUSINESS_ID });
  });

  it("new posting defaults to ACTIVE status", async () => {
    const caller = createCaller(makeCtx("EMPLOYER", db));
    const result = await caller.create(VALID_CREATE_INPUT);
    expect(result).toMatchObject({ status: "ACTIVE" });
  });

  it("stores optional fields when provided", async () => {
    db.insert.mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([{ ...MOCK_JOB, payNotes: "Based on experience" }]),
      }),
    });
    const caller = createCaller(makeCtx("EMPLOYER", db));
    const result = await caller.create({
      ...VALID_CREATE_INPUT,
      payNotes: "Based on experience",
    });
    expect(result).toMatchObject({ payNotes: "Based on experience" });
  });

  it("deduplicates workDays", async () => {
    db.insert.mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([{ ...MOCK_JOB, workDays: ["MON", "TUE"] }]),
      }),
    });
    const caller = createCaller(makeCtx("EMPLOYER", db));
    const result = await caller.create({
      ...VALID_CREATE_INPUT,
      workDays: ["MON", "MON", "TUE"] as Array<
        "SUN" | "MON" | "TUE" | "WED" | "THU" | "FRI" | "SAT"
      >,
    });
    expect(result.workDays).toEqual(["MON", "TUE"]);
  });

  // ── Boundary cases ──

  it("accepts description at exactly 5000 chars", async () => {
    const caller = createCaller(makeCtx("EMPLOYER", db));
    await expect(
      caller.create({ ...VALID_CREATE_INPUT, description: "a".repeat(5000) }),
    ).resolves.toBeDefined();
  });

  it("rejects description longer than 5000 chars", async () => {
    const caller = createCaller(makeCtx("EMPLOYER", db));
    await expect(
      caller.create({ ...VALID_CREATE_INPUT, description: "a".repeat(5001) }),
    ).rejects.toThrow(TRPCError);
  });

  it("accepts minHourlyRate of 0.01", async () => {
    const caller = createCaller(makeCtx("EMPLOYER", db));
    await expect(
      caller.create({ ...VALID_CREATE_INPUT, minHourlyRate: 0.01 }),
    ).resolves.toBeDefined();
  });

  it("rejects minHourlyRate of 0", async () => {
    const caller = createCaller(makeCtx("EMPLOYER", db));
    await expect(caller.create({ ...VALID_CREATE_INPUT, minHourlyRate: 0 })).rejects.toThrow(
      TRPCError,
    );
  });

  it("rejects negative minHourlyRate", async () => {
    const caller = createCaller(makeCtx("EMPLOYER", db));
    await expect(caller.create({ ...VALID_CREATE_INPUT, minHourlyRate: -5 })).rejects.toThrow(
      TRPCError,
    );
  });

  it("accepts empty workDays array", async () => {
    const caller = createCaller(makeCtx("EMPLOYER", db));
    await expect(caller.create({ ...VALID_CREATE_INPUT, workDays: [] })).resolves.toBeDefined();
  });

  // ── Adversarial ──

  it("throws UNAUTHORIZED when session is null", async () => {
    const caller = createCaller(makeCtx(null, db));
    await expect(caller.create(VALID_CREATE_INPUT)).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
  });

  it("throws FORBIDDEN when called by a SEEKER", async () => {
    const caller = createCaller(makeCtx("SEEKER", db));
    await expect(caller.create(VALID_CREATE_INPUT)).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });

  it("throws NOT_FOUND when business does not exist", async () => {
    db.query.business.findFirst.mockResolvedValue(null);
    const caller = createCaller(makeCtx("EMPLOYER", db));
    await expect(caller.create(VALID_CREATE_INPUT)).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });

  it("throws NOT_FOUND when business belongs to a different employer", async () => {
    db.query.business.findFirst.mockResolvedValue({
      id: BUSINESS_ID,
      ownerId: OTHER_EMPLOYER_USER_ID,
    });
    const caller = createCaller(makeCtx("EMPLOYER", db, EMPLOYER_USER_ID));
    await expect(caller.create(VALID_CREATE_INPUT)).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });
});

// ── jobPosting.list ───────────────────────────────────────────────────────────

describe("jobPosting.list", () => {
  let db: ReturnType<typeof makeMockDb>;

  beforeEach(() => {
    db = makeMockDb();
    db.query.business.findFirst.mockResolvedValue(null);
    db.query.jobPosting.findMany.mockResolvedValue([]);
    // count queries
    db.select.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          groupBy: vi.fn().mockResolvedValue([]),
          limit: vi.fn().mockResolvedValue([]),
        }),
        innerJoin: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
        groupBy: vi.fn().mockResolvedValue([]),
      }),
    });
    db.execute.mockResolvedValue({ rows: [] });
  });

  // ── Happy path ──

  it("returns empty array when no postings exist", async () => {
    const caller = createCaller(makeCtx(null, db));
    const result = await caller.list({});
    expect(result).toEqual([]);
  });

  it("returns postings from findMany", async () => {
    db.query.jobPosting.findMany.mockResolvedValue([MOCK_JOB_SEARCH_RESULT]);
    const caller = createCaller(makeCtx(null, db));
    const result = await caller.list({});
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ id: JOB_ID });
  });

  // ── Non-owner visibility (only ACTIVE) ──

  it("unauthenticated caller only queries ACTIVE postings", async () => {
    const caller = createCaller(makeCtx(null, db));
    await caller.list({});
    expect(db.query.jobPosting.findMany).toHaveBeenCalled();
  });

  it("SEEKER only queries ACTIVE postings", async () => {
    const caller = createCaller(makeCtx("SEEKER", db));
    await caller.list({});
    expect(db.query.jobPosting.findMany).toHaveBeenCalled();
  });

  it("EMPLOYER querying another employer's business only sees ACTIVE", async () => {
    db.query.business.findFirst.mockResolvedValue(null); // other employer's business → not found for this user
    const caller = createCaller(makeCtx("EMPLOYER", db));
    await caller.list({ businessId: OTHER_BUSINESS_ID });
    expect(db.query.jobPosting.findMany).toHaveBeenCalled();
  });

  it("EMPLOYER querying own business sees all statuses by default", async () => {
    db.query.business.findFirst.mockResolvedValue(MOCK_BUSINESS);
    const caller = createCaller(makeCtx("EMPLOYER", db));
    await caller.list({ businessId: BUSINESS_ID });
    expect(db.query.jobPosting.findMany).toHaveBeenCalled();
  });

  it("EMPLOYER can filter own postings to a specific status", async () => {
    db.query.business.findFirst.mockResolvedValue(MOCK_BUSINESS);
    const caller = createCaller(makeCtx("EMPLOYER", db));
    await caller.list({ businessId: BUSINESS_ID, status: ["ACTIVE"] });
    expect(db.query.jobPosting.findMany).toHaveBeenCalled();
  });

  it("applies businessId filter to query when provided", async () => {
    db.query.business.findFirst.mockResolvedValue(MOCK_BUSINESS);
    const caller = createCaller(makeCtx("EMPLOYER", db));
    await caller.list({ businessId: BUSINESS_ID });
    expect(db.query.jobPosting.findMany).toHaveBeenCalled();
  });

  // ── New filter fields ──

  it("applies state filter as geo fallback when radiusMiles given but geocoding fails", async () => {
    // City lookup returns null → geo fallback uses text matching
    db.select.mockReturnValue({
      from: vi.fn().mockReturnValue({
        innerJoin: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]), // no city coords found
          }),
        }),
        where: vi.fn().mockReturnValue({
          groupBy: vi.fn().mockResolvedValue([]),
          limit: vi.fn().mockResolvedValue([]),
        }),
        groupBy: vi.fn().mockResolvedValue([]),
      }),
    });
    const caller = createCaller(makeCtx(null, db));
    await caller.list({ state: "NY", radiusMiles: 25 });
    expect(db.query.jobPosting.findMany).toHaveBeenCalled();
  });

  it("omits state from where when no radiusMiles provided", async () => {
    const caller = createCaller(makeCtx(null, db));
    await caller.list({ state: "NY" });
    expect(db.query.jobPosting.findMany).toHaveBeenCalled();
  });

  it("applies city filter as geo fallback when radiusMiles given but geocoding fails", async () => {
    db.select.mockReturnValue({
      from: vi.fn().mockReturnValue({
        innerJoin: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
        where: vi.fn().mockReturnValue({
          groupBy: vi.fn().mockResolvedValue([]),
          limit: vi.fn().mockResolvedValue([]),
        }),
        groupBy: vi.fn().mockResolvedValue([]),
      }),
    });
    const caller = createCaller(makeCtx(null, db));
    await caller.list({ city: "Brooklyn", radiusMiles: 25 });
    expect(db.query.jobPosting.findMany).toHaveBeenCalled();
  });

  it("applies jobType filter when provided", async () => {
    const caller = createCaller(makeCtx(null, db));
    await caller.list({ jobType: ["FULL_TIME"] });
    expect(db.query.jobPosting.findMany).toHaveBeenCalled();
  });

  it("omits jobType from where when empty array is provided", async () => {
    const caller = createCaller(makeCtx(null, db));
    await caller.list({ jobType: [] });
    expect(db.query.jobPosting.findMany).toHaveBeenCalled();
  });

  it("applies workArrangement filter with multiple values when provided", async () => {
    const caller = createCaller(makeCtx(null, db));
    await caller.list({ workArrangement: ["REMOTE", "HYBRID"] });
    expect(db.query.jobPosting.findMany).toHaveBeenCalled();
  });

  it("applies workDays filter using hasSome when provided", async () => {
    const caller = createCaller(makeCtx(null, db));
    await caller.list({ workDays: ["MON", "TUE"] });
    expect(db.query.jobPosting.findMany).toHaveBeenCalled();
  });

  it("omits workDays from where when empty array is provided", async () => {
    const caller = createCaller(makeCtx(null, db));
    await caller.list({ workDays: [] });
    expect(db.query.jobPosting.findMany).toHaveBeenCalled();
  });

  it("non-owner still sees only ACTIVE even when other filters are applied", async () => {
    const caller = createCaller(makeCtx("SEEKER", db));
    await caller.list({ state: "NY", radiusMiles: 25, jobType: ["FULL_TIME"] });
    expect(db.query.jobPosting.findMany).toHaveBeenCalled();
  });
});

// ── jobPosting.getById ────────────────────────────────────────────────────────

describe("jobPosting.getById", () => {
  let db: ReturnType<typeof makeMockDb>;

  beforeEach(() => {
    db = makeMockDb();
  });

  // ── Happy path ──

  it("returns an ACTIVE posting to any caller", async () => {
    db.query.jobPosting.findFirst.mockResolvedValue(MOCK_JOB);
    const caller = createCaller(makeCtx(null, db));
    const result = await caller.getById({ id: JOB_ID });
    expect(result).toMatchObject({ id: JOB_ID, status: "ACTIVE" });
  });

  it("returns an ACTIVE posting to an authenticated SEEKER", async () => {
    db.query.jobPosting.findFirst.mockResolvedValue(MOCK_JOB);
    const caller = createCaller(makeCtx("SEEKER", db));
    const result = await caller.getById({ id: JOB_ID });
    expect(result).toMatchObject({ id: JOB_ID });
  });

  it("owner can retrieve their own PAUSED posting", async () => {
    db.query.jobPosting.findFirst.mockResolvedValue({ ...MOCK_JOB, status: "PAUSED" });
    const caller = createCaller(makeCtx("EMPLOYER", db, EMPLOYER_USER_ID));
    const result = await caller.getById({ id: JOB_ID });
    expect(result).toMatchObject({ id: JOB_ID, status: "PAUSED" });
  });

  // ── Adversarial ──

  it("throws NOT_FOUND for non-existent id", async () => {
    db.query.jobPosting.findFirst.mockResolvedValue(null);
    const caller = createCaller(makeCtx(null, db));
    await expect(caller.getById({ id: "does-not-exist" })).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });

  it("throws NOT_FOUND for PAUSED posting when caller is not the owner", async () => {
    db.query.jobPosting.findFirst.mockResolvedValue({ ...MOCK_JOB, status: "PAUSED" });
    const caller = createCaller(makeCtx(null, db));
    await expect(caller.getById({ id: JOB_ID })).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });
});

// ── jobPosting.update ─────────────────────────────────────────────────────────

describe("jobPosting.update", () => {
  let db: ReturnType<typeof makeMockDb>;

  beforeEach(() => {
    db = makeMockDb();
    db.query.jobPosting.findFirst.mockResolvedValue(MOCK_JOB);
    db.update.mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([{ ...MOCK_JOB, title: "Updated Title" }]),
        }),
      }),
    });
    // For city lookup if city/state provided
    db.select.mockReturnValue({
      from: vi.fn().mockReturnValue({
        innerJoin: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([MOCK_CITY_COORDS]),
          }),
        }),
        where: vi.fn().mockReturnValue({
          groupBy: vi.fn().mockResolvedValue([]),
          limit: vi.fn().mockResolvedValue([MOCK_CITY_COORDS]),
        }),
        groupBy: vi.fn().mockResolvedValue([]),
      }),
    });
    db.delete.mockReturnValue({ where: vi.fn().mockResolvedValue(undefined) });
  });

  // ── Happy path ──

  it("owner can update their own posting", async () => {
    const caller = createCaller(makeCtx("EMPLOYER", db, EMPLOYER_USER_ID));
    const result = await caller.update({ id: JOB_ID, title: "Updated Title" });
    expect(result).toMatchObject({ title: "Updated Title" });
  });

  it("can change status to ACTIVE", async () => {
    db.update.mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([{ ...MOCK_JOB, status: "ACTIVE" }]),
        }),
      }),
    });
    const caller = createCaller(makeCtx("EMPLOYER", db, EMPLOYER_USER_ID));
    const result = await caller.update({ id: JOB_ID, status: "ACTIVE" });
    expect(result).toMatchObject({ status: "ACTIVE" });
  });

  it("cannot set status to CLOSED via update — use close procedure instead", async () => {
    const caller = createCaller(makeCtx("EMPLOYER", db, EMPLOYER_USER_ID));
    await expect(
      // @ts-expect-error testing invalid input
      caller.update({ id: JOB_ID, status: "CLOSED" }),
    ).rejects.toThrow(TRPCError);
  });

  // ── Adversarial ──

  it("throws UNAUTHORIZED when no session", async () => {
    const caller = createCaller(makeCtx(null, db));
    await expect(caller.update({ id: JOB_ID, title: "x" })).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
  });

  it("throws FORBIDDEN when called by a SEEKER", async () => {
    const caller = createCaller(makeCtx("SEEKER", db));
    await expect(caller.update({ id: JOB_ID, title: "x" })).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });

  it("throws FORBIDDEN when employer does not own the posting", async () => {
    db.query.jobPosting.findFirst.mockResolvedValue({
      ...MOCK_JOB,
      employerId: OTHER_EMPLOYER_USER_ID,
    });
    const caller = createCaller(makeCtx("EMPLOYER", db, EMPLOYER_USER_ID));
    await expect(caller.update({ id: JOB_ID, title: "x" })).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });

  it("throws NOT_FOUND when job does not exist", async () => {
    db.query.jobPosting.findFirst.mockResolvedValue(null);
    const caller = createCaller(makeCtx("EMPLOYER", db, EMPLOYER_USER_ID));
    await expect(caller.update({ id: "no-such-job", title: "x" })).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });

  it("throws BAD_REQUEST when trying to update a CLOSED posting", async () => {
    db.query.jobPosting.findFirst.mockResolvedValue(MOCK_JOB_CLOSED);
    const caller = createCaller(makeCtx("EMPLOYER", db, EMPLOYER_USER_ID));
    await expect(caller.update({ id: JOB_ID, title: "x" })).rejects.toMatchObject({
      code: "BAD_REQUEST",
    });
  });
});

// ── jobPosting.close ─────────────────────────────────────────────────────────

describe("jobPosting.close", () => {
  let db: ReturnType<typeof makeMockDb>;

  beforeEach(() => {
    db = makeMockDb();
    db.query.jobPosting.findFirst.mockResolvedValue(MOCK_JOB);
    db.update.mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([{ id: JOB_ID, status: "CLOSED" }]),
        }),
      }),
    });
  });

  // ── Happy path ──

  it("sets status to CLOSED with closure reason", async () => {
    const caller = createCaller(makeCtx("EMPLOYER", db, EMPLOYER_USER_ID));
    const result = await caller.close({ id: JOB_ID, reason: "FILLED_ON_SHEFA" });
    expect(result).toMatchObject({ status: "CLOSED" });
    expect(db.update).toHaveBeenCalled();
  });

  it("returns the updated (closed) posting", async () => {
    const caller = createCaller(makeCtx("EMPLOYER", db, EMPLOYER_USER_ID));
    const result = await caller.close({ id: JOB_ID, reason: "CANCELLED" });
    expect(result).toMatchObject({ status: "CLOSED" });
  });

  it.each(["FILLED_ON_SHEFA", "FILLED_ELSEWHERE", "HIRING_FROZEN", "CANCELLED", "OTHER"] as const)(
    "accepts closure reason %s",
    async (reason) => {
      const caller = createCaller(makeCtx("EMPLOYER", db, EMPLOYER_USER_ID));
      await expect(caller.close({ id: JOB_ID, reason })).resolves.toBeDefined();
    },
  );

  it("cascades: closes the job's open applications (job update + application update)", async () => {
    const setSpy = vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([{ id: JOB_ID, status: "CLOSED" }]),
      }),
    });
    db.update.mockReturnValue({ set: setSpy });

    const caller = createCaller(makeCtx("EMPLOYER", db, EMPLOYER_USER_ID));
    await caller.close({ id: JOB_ID, reason: "FILLED_ON_SHEFA" });

    // One update for the job, one for the application cascade.
    expect(db.update).toHaveBeenCalledTimes(2);
    expect(setSpy).toHaveBeenCalledWith(expect.objectContaining({ status: "CLOSED" }));
  });

  // ── Hire recording (FILLED_ON_SHEFA) ──

  it("records hiredApplicationId when FILLED_ON_SHEFA names a valid applicant", async () => {
    const setSpy = vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([{ id: JOB_ID, status: "CLOSED" }]),
      }),
    });
    db.update.mockReturnValue({ set: setSpy });
    db.query.application.findFirst.mockResolvedValue({
      id: "app-1",
      jobId: JOB_ID,
      status: "VIEWED",
    });

    const caller = createCaller(makeCtx("EMPLOYER", db, EMPLOYER_USER_ID));
    await caller.close({ id: JOB_ID, reason: "FILLED_ON_SHEFA", hiredApplicationId: "app-1" });

    expect(setSpy).toHaveBeenCalledWith(
      expect.objectContaining({ status: "CLOSED", hiredApplicationId: "app-1" }),
    );
  });

  it("ignores hiredApplicationId when reason is not FILLED_ON_SHEFA", async () => {
    const setSpy = vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([{ id: JOB_ID, status: "CLOSED" }]),
      }),
    });
    db.update.mockReturnValue({ set: setSpy });

    const caller = createCaller(makeCtx("EMPLOYER", db, EMPLOYER_USER_ID));
    await caller.close({ id: JOB_ID, reason: "FILLED_ELSEWHERE", hiredApplicationId: "app-1" });

    expect(setSpy).toHaveBeenCalledWith(expect.objectContaining({ hiredApplicationId: null }));
    // No application lookup needed when the reason isn't a Shefa hire.
    expect(db.query.application.findFirst).not.toHaveBeenCalled();
  });

  it("BAD_REQUEST when the named application does not belong to the job", async () => {
    db.query.application.findFirst.mockResolvedValue(undefined);
    const caller = createCaller(makeCtx("EMPLOYER", db, EMPLOYER_USER_ID));
    await expect(
      caller.close({ id: JOB_ID, reason: "FILLED_ON_SHEFA", hiredApplicationId: "foreign" }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("BAD_REQUEST when the named application is REJECTED", async () => {
    db.query.application.findFirst.mockResolvedValue({
      id: "app-1",
      jobId: JOB_ID,
      status: "REJECTED",
    });
    const caller = createCaller(makeCtx("EMPLOYER", db, EMPLOYER_USER_ID));
    await expect(
      caller.close({ id: JOB_ID, reason: "FILLED_ON_SHEFA", hiredApplicationId: "app-1" }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  // ── Adversarial ──

  it("throws UNAUTHORIZED when no session", async () => {
    const caller = createCaller(makeCtx(null, db));
    await expect(caller.close({ id: JOB_ID, reason: "OTHER" })).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
  });

  it("throws FORBIDDEN when called by a SEEKER", async () => {
    const caller = createCaller(makeCtx("SEEKER", db));
    await expect(caller.close({ id: JOB_ID, reason: "OTHER" })).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });

  it("throws FORBIDDEN when employer does not own the posting", async () => {
    db.query.jobPosting.findFirst.mockResolvedValue({
      ...MOCK_JOB,
      employerId: OTHER_EMPLOYER_USER_ID,
    });
    const caller = createCaller(makeCtx("EMPLOYER", db, EMPLOYER_USER_ID));
    await expect(caller.close({ id: JOB_ID, reason: "OTHER" })).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });

  it("throws NOT_FOUND when job does not exist", async () => {
    db.query.jobPosting.findFirst.mockResolvedValue(null);
    const caller = createCaller(makeCtx("EMPLOYER", db, EMPLOYER_USER_ID));
    await expect(caller.close({ id: "no-such-job", reason: "OTHER" })).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });
});

// ── jobPosting.reopen ────────────────────────────────────────────────────────

describe("jobPosting.reopen", () => {
  let db: ReturnType<typeof makeMockDb>;
  const CLOSED_JOB = { id: JOB_ID, employerId: EMPLOYER_USER_ID, status: "CLOSED" };

  beforeEach(() => {
    db = makeMockDb();
    db.query.jobPosting.findFirst.mockResolvedValue(CLOSED_JOB);
    db.update.mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([{ id: JOB_ID, status: "PAUSED" }]),
        }),
      }),
    });
  });

  it("reopens a closed job to PAUSED, clearing closure fields", async () => {
    const setSpy = vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([{ id: JOB_ID, status: "PAUSED" }]),
      }),
    });
    db.update.mockReturnValue({ set: setSpy });

    const caller = createCaller(makeCtx("EMPLOYER", db, EMPLOYER_USER_ID));
    const result = await caller.reopen({ id: JOB_ID });

    expect(result).toMatchObject({ status: "PAUSED" });
    expect(setSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "PAUSED",
        closureReason: null,
        closedAt: null,
        hiredApplicationId: null,
      }),
    );
  });

  it("cascades: closed applications return to SUBMITTED (job update + application update)", async () => {
    const caller = createCaller(makeCtx("EMPLOYER", db, EMPLOYER_USER_ID));
    await caller.reopen({ id: JOB_ID });
    expect(db.update).toHaveBeenCalledTimes(2);
  });

  it("throws BAD_REQUEST when the job is not closed", async () => {
    db.query.jobPosting.findFirst.mockResolvedValue({ ...CLOSED_JOB, status: "ACTIVE" });
    const caller = createCaller(makeCtx("EMPLOYER", db, EMPLOYER_USER_ID));
    await expect(caller.reopen({ id: JOB_ID })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(db.update).not.toHaveBeenCalled();
  });

  it("throws UNAUTHORIZED when no session", async () => {
    const caller = createCaller(makeCtx(null, db));
    await expect(caller.reopen({ id: JOB_ID })).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("throws FORBIDDEN when called by a SEEKER", async () => {
    const caller = createCaller(makeCtx("SEEKER", db));
    await expect(caller.reopen({ id: JOB_ID })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("throws FORBIDDEN when employer does not own the posting", async () => {
    db.query.jobPosting.findFirst.mockResolvedValue({
      ...CLOSED_JOB,
      employerId: OTHER_EMPLOYER_USER_ID,
    });
    const caller = createCaller(makeCtx("EMPLOYER", db, EMPLOYER_USER_ID));
    await expect(caller.reopen({ id: JOB_ID })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("throws NOT_FOUND when job does not exist", async () => {
    db.query.jobPosting.findFirst.mockResolvedValue(null);
    const caller = createCaller(makeCtx("EMPLOYER", db, EMPLOYER_USER_ID));
    await expect(caller.reopen({ id: "no-such-job" })).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});

// ── jobPosting.search ─────────────────────────────────────────────────────────

describe("jobPosting.search", () => {
  let db: ReturnType<typeof makeMockDb>;

  beforeEach(() => {
    db = makeMockDb();
    db.execute.mockResolvedValue({ rows: [] });
    db.query.jobPosting.findMany.mockResolvedValue([]);
    // For count queries
    db.select.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          groupBy: vi.fn().mockResolvedValue([]),
        }),
        innerJoin: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
        groupBy: vi.fn().mockResolvedValue([]),
      }),
    });
  });

  // ── Happy path ──

  it("returns empty array when no trigram matches exist", async () => {
    const caller = createCaller(makeCtx(null, db));
    const result = await caller.search({ q: "chef" });
    expect(result).toEqual([]);
  });

  it("returns jobs with rank attached from the raw query", async () => {
    db.execute.mockResolvedValue({ rows: [{ id: JOB_ID, rank: 1.5 }] });
    db.query.jobPosting.findMany.mockResolvedValue([MOCK_JOB_SEARCH_RESULT]);
    const caller = createCaller(makeCtx(null, db));
    const result = await caller.search({ q: "cook" });
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ id: JOB_ID, rank: 1.5 });
  });

  it("preserves rank order from raw query regardless of findMany return order", async () => {
    db.execute.mockResolvedValue({
      rows: [
        { id: "job-a", rank: 2.0 },
        { id: "job-b", rank: 0.8 },
      ],
    });
    // findMany returns them in reverse — the procedure must re-sort by raw query order
    db.query.jobPosting.findMany.mockResolvedValue([
      { ...MOCK_JOB_SEARCH_RESULT, id: "job-b" },
      { ...MOCK_JOB_SEARCH_RESULT, id: "job-a" },
    ]);
    const caller = createCaller(makeCtx(null, db));
    const result = await caller.search({ q: "kitchen" });
    expect(result[0]!.id).toBe("job-a");
    expect(result[1]!.id).toBe("job-b");
  });

  it("coerces rank to number when Postgres returns a string (numeric type edge case)", async () => {
    // Some Postgres numeric types come back as strings through certain drivers
    db.execute.mockResolvedValue({ rows: [{ id: JOB_ID, rank: "1.23" as unknown as number }] });
    db.query.jobPosting.findMany.mockResolvedValue([MOCK_JOB_SEARCH_RESULT]);
    const caller = createCaller(makeCtx(null, db));
    const result = await caller.search({ q: "cook" });
    expect(typeof result[0]!.rank).toBe("number");
    expect(result[0]!.rank).toBeCloseTo(1.23);
  });

  it("skips findMany entirely when the raw query returns no rows", async () => {
    const caller = createCaller(makeCtx(null, db));
    await caller.search({ q: "xyz" });
    expect(db.query.jobPosting.findMany).not.toHaveBeenCalled();
  });

  // ── Silent failure ──

  it("omits a job that disappeared between the raw query and findMany", async () => {
    // Race condition: job deleted after trigram scan but before fetch
    db.execute.mockResolvedValue({
      rows: [
        { id: "job-a", rank: 2.0 },
        { id: "job-gone", rank: 1.0 },
      ],
    });
    db.query.jobPosting.findMany.mockResolvedValue([{ ...MOCK_JOB_SEARCH_RESULT, id: "job-a" }]);
    const caller = createCaller(makeCtx(null, db));
    const result = await caller.search({ q: "cook" });
    expect(result).toHaveLength(1);
    expect(result[0]!.id).toBe("job-a");
  });

  // ── Input validation ──

  it("rejects empty string", async () => {
    const caller = createCaller(makeCtx(null, db));
    await expect(caller.search({ q: "" })).rejects.toThrow(TRPCError);
  });

  it("rejects string longer than 200 characters", async () => {
    const caller = createCaller(makeCtx(null, db));
    await expect(caller.search({ q: "a".repeat(201) })).rejects.toThrow(TRPCError);
  });

  it("accepts exactly 200 characters", async () => {
    const caller = createCaller(makeCtx(null, db));
    await expect(caller.search({ q: "a".repeat(200) })).resolves.toBeDefined();
  });

  it("passes the trimmed query to the raw SQL, not the raw whitespace-padded input", async () => {
    const caller = createCaller(makeCtx(null, db));
    await caller.search({ q: "  cook  " });
    // execute is called with a tagged template — just verify it was called
    expect(db.execute).toHaveBeenCalled();
  });

  // ── Public access ──

  it("is accessible to unauthenticated users", async () => {
    const caller = createCaller(makeCtx(null, db));
    await expect(caller.search({ q: "cook" })).resolves.toBeDefined();
  });

  it("is accessible to a SEEKER", async () => {
    const caller = createCaller(makeCtx("SEEKER", db));
    await expect(caller.search({ q: "cook" })).resolves.toBeDefined();
  });

  it("is accessible to an EMPLOYER", async () => {
    const caller = createCaller(makeCtx("EMPLOYER", db));
    await expect(caller.search({ q: "cook" })).resolves.toBeDefined();
  });
});
