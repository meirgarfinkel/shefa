import { describe, it, expect, vi, beforeEach } from "vitest";
import { TRPCError } from "@trpc/server";
import { createCallerFactory } from "@/server/api/trpc";
import { jobPostingRouter } from "../jobPosting";

vi.mock("@/lib/prisma", () => ({ prisma: {} }));
vi.mock("@/auth", () => ({ auth: vi.fn() }));

// ── Mock helpers ──────────────────────────────────────────────────────────────

function makeMockPrisma() {
  return {
    $queryRaw: vi.fn(),
    company: {
      findUnique: vi.fn(),
    },
    city: {
      findFirst: vi.fn().mockResolvedValue(null),
    },
    jobPosting: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
    },
  };
}

type Role = "SEEKER" | "EMPLOYER" | "ADMIN";

function makeCtx(role: Role | null, prisma: ReturnType<typeof makeMockPrisma>, userId = "user-1") {
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
    prisma: prisma as any,
  };
}

const createCaller = createCallerFactory(jobPostingRouter);

// ── Fixtures ──────────────────────────────────────────────────────────────────

const EMPLOYER_USER_ID = "user-1";
const OTHER_EMPLOYER_USER_ID = "user-2";
const COMPANY_ID = "company-1";
const OTHER_COMPANY_ID = "company-2";
const JOB_ID = "job-1";

const MOCK_COMPANY = { id: COMPANY_ID, ownerId: EMPLOYER_USER_ID };

const MOCK_JOB = {
  id: JOB_ID,
  employerId: EMPLOYER_USER_ID,
  companyId: COMPANY_ID,
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
  whatWeTeach: null,
  whatWereLookingFor: null,
  status: "ACTIVE",
  applicationCount: 0,
  lastVerifiedAt: new Date(),
  createdAt: new Date(),
  updatedAt: new Date(),
  requiredLanguages: [],
};

// Shape returned by search's findMany (includes company + _count)
const MOCK_JOB_SEARCH_RESULT = {
  ...MOCK_JOB,
  lat: 40.65,
  lon: -73.95,
  requiredLanguages: [],
  company: { id: COMPANY_ID, name: "Mama's Kitchen", city: "Brooklyn", state: "NY" },
  _count: { applications: 0 },
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
  companyId: COMPANY_ID,
};

// ── jobPosting.create ─────────────────────────────────────────────────────────

describe("jobPosting.create", () => {
  let db: ReturnType<typeof makeMockPrisma>;

  beforeEach(() => {
    db = makeMockPrisma();
    db.company.findUnique.mockResolvedValue(MOCK_COMPANY);
    db.jobPosting.create.mockResolvedValue(MOCK_JOB);
  });

  // ── Happy path ──

  it("creates posting and returns it", async () => {
    const caller = createCaller(makeCtx("EMPLOYER", db));
    const result = await caller.create(VALID_CREATE_INPUT);
    expect(result).toMatchObject({ id: JOB_ID });
  });

  it("sets employerId from the session, not input", async () => {
    const caller = createCaller(makeCtx("EMPLOYER", db, EMPLOYER_USER_ID));
    await caller.create(VALID_CREATE_INPUT);
    const data = db.jobPosting.create.mock.calls[0][0].data;
    expect(data.employerId).toBe(EMPLOYER_USER_ID);
  });

  it("sets companyId from input after validating ownership", async () => {
    const caller = createCaller(makeCtx("EMPLOYER", db));
    await caller.create(VALID_CREATE_INPUT);
    const data = db.jobPosting.create.mock.calls[0][0].data;
    expect(data.companyId).toBe(COMPANY_ID);
  });

  it("new posting defaults to ACTIVE status", async () => {
    const caller = createCaller(makeCtx("EMPLOYER", db));
    await caller.create(VALID_CREATE_INPUT);
    // status is not set explicitly — Prisma schema default is ACTIVE
    const data = db.jobPosting.create.mock.calls[0][0].data;
    expect(data.status).toBeUndefined();
  });

  it("stores optional fields when provided", async () => {
    const caller = createCaller(makeCtx("EMPLOYER", db));
    await caller.create({
      ...VALID_CREATE_INPUT,
      payNotes: "Based on experience",
      whatWeTeach: "Cooking basics",
    });
    const data = db.jobPosting.create.mock.calls[0][0].data;
    expect(data.payNotes).toBe("Based on experience");
    expect(data.whatWeTeach).toBe("Cooking basics");
  });

  it("deduplicates workDays", async () => {
    const caller = createCaller(makeCtx("EMPLOYER", db));
    await caller.create({
      ...VALID_CREATE_INPUT,
      workDays: ["MON", "MON", "TUE"] as Array<
        "SUN" | "MON" | "TUE" | "WED" | "THU" | "FRI" | "SAT"
      >,
    });
    const data = db.jobPosting.create.mock.calls[0][0].data;
    expect(data.workDays).toEqual(["MON", "TUE"]);
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

  it("accepts whatWeTeach at exactly 1000 chars", async () => {
    const caller = createCaller(makeCtx("EMPLOYER", db));
    await expect(
      caller.create({ ...VALID_CREATE_INPUT, whatWeTeach: "a".repeat(1000) }),
    ).resolves.toBeDefined();
  });

  it("rejects whatWeTeach longer than 1000 chars", async () => {
    const caller = createCaller(makeCtx("EMPLOYER", db));
    await expect(
      caller.create({ ...VALID_CREATE_INPUT, whatWeTeach: "a".repeat(1001) }),
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

  it("throws NOT_FOUND when company does not exist", async () => {
    db.company.findUnique.mockResolvedValue(null);
    const caller = createCaller(makeCtx("EMPLOYER", db));
    await expect(caller.create(VALID_CREATE_INPUT)).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });

  it("throws NOT_FOUND when company belongs to a different employer", async () => {
    db.company.findUnique.mockResolvedValue({ id: COMPANY_ID, ownerId: OTHER_EMPLOYER_USER_ID });
    const caller = createCaller(makeCtx("EMPLOYER", db, EMPLOYER_USER_ID));
    await expect(caller.create(VALID_CREATE_INPUT)).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });
});

// ── jobPosting.list ───────────────────────────────────────────────────────────

describe("jobPosting.list", () => {
  let db: ReturnType<typeof makeMockPrisma>;

  beforeEach(() => {
    db = makeMockPrisma();
    db.company.findUnique.mockResolvedValue(null);
    db.jobPosting.findMany.mockResolvedValue([]);
  });

  // ── Happy path ──

  it("returns empty array when no postings exist", async () => {
    const caller = createCaller(makeCtx(null, db));
    const result = await caller.list({});
    expect(result).toEqual([]);
  });

  it("returns postings from findMany", async () => {
    db.jobPosting.findMany.mockResolvedValue([MOCK_JOB]);
    const caller = createCaller(makeCtx(null, db));
    const result = await caller.list({});
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ id: JOB_ID });
  });

  // ── Non-owner visibility (only ACTIVE) ──

  it("unauthenticated caller only queries ACTIVE postings", async () => {
    const caller = createCaller(makeCtx(null, db));
    await caller.list({});
    const where = db.jobPosting.findMany.mock.calls[0][0].where;
    expect(where.status).toEqual({ in: ["ACTIVE"] });
  });

  it("SEEKER only queries ACTIVE postings", async () => {
    const caller = createCaller(makeCtx("SEEKER", db));
    await caller.list({});
    const where = db.jobPosting.findMany.mock.calls[0][0].where;
    expect(where.status).toEqual({ in: ["ACTIVE"] });
  });

  it("EMPLOYER querying another employer's company only sees ACTIVE", async () => {
    db.company.findUnique.mockResolvedValue(null); // other employer's company → not found for this user
    const caller = createCaller(makeCtx("EMPLOYER", db));
    await caller.list({ companyId: OTHER_COMPANY_ID });
    const where = db.jobPosting.findMany.mock.calls[0][0].where;
    expect(where.status).toEqual({ in: ["ACTIVE"] });
  });

  it("EMPLOYER querying own company sees all statuses by default", async () => {
    db.company.findUnique.mockResolvedValue(MOCK_COMPANY);
    const caller = createCaller(makeCtx("EMPLOYER", db));
    await caller.list({ companyId: COMPANY_ID });
    const where = db.jobPosting.findMany.mock.calls[0][0].where;
    // status should not be restricted to ACTIVE only
    expect(where.status).not.toEqual({ in: ["ACTIVE"] });
  });

  it("EMPLOYER can filter own postings to a specific status", async () => {
    db.company.findUnique.mockResolvedValue(MOCK_COMPANY);
    const caller = createCaller(makeCtx("EMPLOYER", db));
    await caller.list({ companyId: COMPANY_ID, status: ["ACTIVE"] });
    const where = db.jobPosting.findMany.mock.calls[0][0].where;
    expect(where.status).toEqual({ in: ["ACTIVE"] });
  });

  it("applies companyId filter to query when provided", async () => {
    db.company.findUnique.mockResolvedValue(MOCK_COMPANY);
    const caller = createCaller(makeCtx("EMPLOYER", db));
    await caller.list({ companyId: COMPANY_ID });
    const where = db.jobPosting.findMany.mock.calls[0][0].where;
    expect(where.companyId).toBe(COMPANY_ID);
  });

  // ── New filter fields ──

  it("applies state filter as geo fallback when radiusMiles given but geocoding fails", async () => {
    // city.findFirst returns null (geocoding failure) — router falls back to text match.
    // state/city text filter is ONLY applied inside the radiusMiles fallback branch.
    const caller = createCaller(makeCtx(null, db));
    await caller.list({ state: "NY", radiusMiles: 25 });
    const where = db.jobPosting.findMany.mock.calls[0][0].where;
    expect(where.state).toEqual({ contains: "NY", mode: "insensitive" });
  });

  it("omits state from where when no radiusMiles provided", async () => {
    // Without radiusMiles there is no geo-filter branch — state is not used as a WHERE condition.
    const caller = createCaller(makeCtx(null, db));
    await caller.list({ state: "NY" });
    const where = db.jobPosting.findMany.mock.calls[0][0].where;
    expect(where.state).toBeUndefined();
  });

  it("applies city filter as geo fallback when radiusMiles given but geocoding fails", async () => {
    const caller = createCaller(makeCtx(null, db));
    await caller.list({ city: "Brooklyn", radiusMiles: 25 });
    const where = db.jobPosting.findMany.mock.calls[0][0].where;
    expect(where.city).toEqual({ contains: "Brooklyn", mode: "insensitive" });
  });

  it("applies jobType filter when provided", async () => {
    const caller = createCaller(makeCtx(null, db));
    await caller.list({ jobType: ["FULL_TIME"] });
    const where = db.jobPosting.findMany.mock.calls[0][0].where;
    expect(where.jobType).toEqual({ in: ["FULL_TIME"] });
  });

  it("omits jobType from where when empty array is provided", async () => {
    const caller = createCaller(makeCtx(null, db));
    await caller.list({ jobType: [] });
    const where = db.jobPosting.findMany.mock.calls[0][0].where;
    expect(where.jobType).toBeUndefined();
  });

  it("applies workArrangement filter with multiple values when provided", async () => {
    const caller = createCaller(makeCtx(null, db));
    await caller.list({ workArrangement: ["REMOTE", "HYBRID"] });
    const where = db.jobPosting.findMany.mock.calls[0][0].where;
    expect(where.workArrangement).toEqual({ in: ["REMOTE", "HYBRID"] });
  });

  it("applies workDays filter using hasSome when provided", async () => {
    const caller = createCaller(makeCtx(null, db));
    await caller.list({ workDays: ["MON", "TUE"] });
    const where = db.jobPosting.findMany.mock.calls[0][0].where;
    expect(where.workDays).toEqual({ hasSome: ["MON", "TUE"] });
  });

  it("omits workDays from where when empty array is provided", async () => {
    const caller = createCaller(makeCtx(null, db));
    await caller.list({ workDays: [] });
    const where = db.jobPosting.findMany.mock.calls[0][0].where;
    expect(where.workDays).toBeUndefined();
  });

  it("non-owner still sees only ACTIVE even when other filters are applied", async () => {
    const caller = createCaller(makeCtx("SEEKER", db));
    await caller.list({ state: "NY", radiusMiles: 25, jobType: ["FULL_TIME"] });
    const where = db.jobPosting.findMany.mock.calls[0][0].where;
    expect(where.status).toEqual({ in: ["ACTIVE"] });
    expect(where.state).toEqual({ contains: "NY", mode: "insensitive" });
    expect(where.jobType).toEqual({ in: ["FULL_TIME"] });
  });
});

// ── jobPosting.getById ────────────────────────────────────────────────────────

describe("jobPosting.getById", () => {
  let db: ReturnType<typeof makeMockPrisma>;

  beforeEach(() => {
    db = makeMockPrisma();
  });

  // ── Happy path ──

  it("returns an ACTIVE posting to any caller", async () => {
    db.jobPosting.findUnique.mockResolvedValue(MOCK_JOB);
    const caller = createCaller(makeCtx(null, db));
    const result = await caller.getById({ id: JOB_ID });
    expect(result).toMatchObject({ id: JOB_ID, status: "ACTIVE" });
  });

  it("returns an ACTIVE posting to an authenticated SEEKER", async () => {
    db.jobPosting.findUnique.mockResolvedValue(MOCK_JOB);
    const caller = createCaller(makeCtx("SEEKER", db));
    const result = await caller.getById({ id: JOB_ID });
    expect(result).toMatchObject({ id: JOB_ID });
  });

  it("owner can retrieve their own PAUSED posting", async () => {
    db.jobPosting.findUnique.mockResolvedValue({ ...MOCK_JOB, status: "PAUSED" });
    const caller = createCaller(makeCtx("EMPLOYER", db, EMPLOYER_USER_ID));
    const result = await caller.getById({ id: JOB_ID });
    expect(result).toMatchObject({ id: JOB_ID, status: "PAUSED" });
  });

  // ── Adversarial ──

  it("throws NOT_FOUND for non-existent id", async () => {
    db.jobPosting.findUnique.mockResolvedValue(null);
    const caller = createCaller(makeCtx(null, db));
    await expect(caller.getById({ id: "does-not-exist" })).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });

  it("throws NOT_FOUND for PAUSED posting when caller is not the owner", async () => {
    db.jobPosting.findUnique.mockResolvedValue({ ...MOCK_JOB, status: "PAUSED" });
    const caller = createCaller(makeCtx(null, db));
    await expect(caller.getById({ id: JOB_ID })).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });
});

// ── jobPosting.update ─────────────────────────────────────────────────────────

describe("jobPosting.update", () => {
  let db: ReturnType<typeof makeMockPrisma>;

  beforeEach(() => {
    db = makeMockPrisma();
    db.jobPosting.findUnique.mockResolvedValue(MOCK_JOB);
    db.jobPosting.update.mockResolvedValue({ ...MOCK_JOB, title: "Updated Title" });
  });

  // ── Happy path ──

  it("owner can update their own posting", async () => {
    const caller = createCaller(makeCtx("EMPLOYER", db, EMPLOYER_USER_ID));
    const result = await caller.update({ id: JOB_ID, title: "Updated Title" });
    expect(result).toMatchObject({ title: "Updated Title" });
  });

  it("can change status to ACTIVE", async () => {
    const caller = createCaller(makeCtx("EMPLOYER", db, EMPLOYER_USER_ID));
    await caller.update({ id: JOB_ID, status: "ACTIVE" });
    const data = db.jobPosting.update.mock.calls[0][0].data;
    expect(data.status).toBe("ACTIVE");
  });

  it("cannot set status to CLOSED via update — use delete instead", async () => {
    const caller = createCaller(makeCtx("EMPLOYER", db, EMPLOYER_USER_ID));
    await expect(
      // @ts-expect-error testing invalid input
      caller.update({ id: JOB_ID, status: "CLOSED" }),
    ).rejects.toThrow(TRPCError);
  });

  it("cannot set status to EXPIRED via update — system-managed", async () => {
    const caller = createCaller(makeCtx("EMPLOYER", db, EMPLOYER_USER_ID));
    await expect(
      // @ts-expect-error testing invalid input
      caller.update({ id: JOB_ID, status: "EXPIRED" }),
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
    db.jobPosting.findUnique.mockResolvedValue({
      ...MOCK_JOB,
      employerId: OTHER_EMPLOYER_USER_ID,
    });
    const caller = createCaller(makeCtx("EMPLOYER", db, EMPLOYER_USER_ID));
    await expect(caller.update({ id: JOB_ID, title: "x" })).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });

  it("throws NOT_FOUND when job does not exist", async () => {
    db.jobPosting.findUnique.mockResolvedValue(null);
    const caller = createCaller(makeCtx("EMPLOYER", db, EMPLOYER_USER_ID));
    await expect(caller.update({ id: "no-such-job", title: "x" })).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });

  it("throws BAD_REQUEST when trying to update a CLOSED posting", async () => {
    db.jobPosting.findUnique.mockResolvedValue(MOCK_JOB_CLOSED);
    const caller = createCaller(makeCtx("EMPLOYER", db, EMPLOYER_USER_ID));
    await expect(caller.update({ id: JOB_ID, title: "x" })).rejects.toMatchObject({
      code: "BAD_REQUEST",
    });
  });
});

// ── jobPosting.delete ─────────────────────────────────────────────────────────

describe("jobPosting.delete", () => {
  let db: ReturnType<typeof makeMockPrisma>;

  beforeEach(() => {
    db = makeMockPrisma();
    db.jobPosting.findUnique.mockResolvedValue(MOCK_JOB);
    db.jobPosting.update.mockResolvedValue(MOCK_JOB_CLOSED);
  });

  // ── Happy path ──

  it("sets status to CLOSED instead of hard-deleting", async () => {
    const caller = createCaller(makeCtx("EMPLOYER", db, EMPLOYER_USER_ID));
    await caller.delete({ id: JOB_ID });
    const call = db.jobPosting.update.mock.calls[0][0];
    expect(call.where.id).toBe(JOB_ID);
    expect(call.data.status).toBe("CLOSED");
  });

  it("returns the updated (closed) posting", async () => {
    const caller = createCaller(makeCtx("EMPLOYER", db, EMPLOYER_USER_ID));
    const result = await caller.delete({ id: JOB_ID });
    expect(result).toMatchObject({ status: "CLOSED" });
  });

  // ── Adversarial ──

  it("throws UNAUTHORIZED when no session", async () => {
    const caller = createCaller(makeCtx(null, db));
    await expect(caller.delete({ id: JOB_ID })).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
  });

  it("throws FORBIDDEN when called by a SEEKER", async () => {
    const caller = createCaller(makeCtx("SEEKER", db));
    await expect(caller.delete({ id: JOB_ID })).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });

  it("throws FORBIDDEN when employer does not own the posting", async () => {
    db.jobPosting.findUnique.mockResolvedValue({
      ...MOCK_JOB,
      employerId: OTHER_EMPLOYER_USER_ID,
    });
    const caller = createCaller(makeCtx("EMPLOYER", db, EMPLOYER_USER_ID));
    await expect(caller.delete({ id: JOB_ID })).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });

  it("throws NOT_FOUND when job does not exist", async () => {
    db.jobPosting.findUnique.mockResolvedValue(null);
    const caller = createCaller(makeCtx("EMPLOYER", db, EMPLOYER_USER_ID));
    await expect(caller.delete({ id: "no-such-job" })).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });
});

// ── jobPosting.search ─────────────────────────────────────────────────────────

describe("jobPosting.search", () => {
  let db: ReturnType<typeof makeMockPrisma>;

  beforeEach(() => {
    db = makeMockPrisma();
    db.$queryRaw.mockResolvedValue([]);
    db.jobPosting.findMany.mockResolvedValue([]);
  });

  // ── Happy path ──

  it("returns empty array when no trigram matches exist", async () => {
    const caller = createCaller(makeCtx(null, db));
    const result = await caller.search({ q: "chef" });
    expect(result).toEqual([]);
  });

  it("returns jobs with rank attached from the raw query", async () => {
    db.$queryRaw.mockResolvedValue([{ id: JOB_ID, rank: 1.5 }]);
    db.jobPosting.findMany.mockResolvedValue([MOCK_JOB_SEARCH_RESULT]);
    const caller = createCaller(makeCtx(null, db));
    const result = await caller.search({ q: "cook" });
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ id: JOB_ID, rank: 1.5 });
  });

  it("preserves rank order from raw query regardless of findMany return order", async () => {
    db.$queryRaw.mockResolvedValue([
      { id: "job-a", rank: 2.0 },
      { id: "job-b", rank: 0.8 },
    ]);
    // findMany returns them in reverse — the procedure must re-sort by raw query order
    db.jobPosting.findMany.mockResolvedValue([
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
    db.$queryRaw.mockResolvedValue([{ id: JOB_ID, rank: "1.23" as unknown as number }]);
    db.jobPosting.findMany.mockResolvedValue([MOCK_JOB_SEARCH_RESULT]);
    const caller = createCaller(makeCtx(null, db));
    const result = await caller.search({ q: "cook" });
    expect(typeof result[0]!.rank).toBe("number");
    expect(result[0]!.rank).toBeCloseTo(1.23);
  });

  it("skips findMany entirely when the raw query returns no rows", async () => {
    const caller = createCaller(makeCtx(null, db));
    await caller.search({ q: "xyz" });
    expect(db.jobPosting.findMany).not.toHaveBeenCalled();
  });

  // ── Silent failure ──

  it("omits a job that disappeared between the raw query and findMany", async () => {
    // Race condition: job deleted after trigram scan but before Prisma fetch
    db.$queryRaw.mockResolvedValue([
      { id: "job-a", rank: 2.0 },
      { id: "job-gone", rank: 1.0 },
    ]);
    db.jobPosting.findMany.mockResolvedValue([{ ...MOCK_JOB_SEARCH_RESULT, id: "job-a" }]);
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
    // $queryRaw is called as a tagged template: first arg is TemplateStringsArray,
    // subsequent args are the interpolated values. The first interpolated value is input.q.
    expect(db.$queryRaw.mock.calls[0]?.[1]).toBe("cook");
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
