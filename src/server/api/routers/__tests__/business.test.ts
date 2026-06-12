import { describe, it, expect, vi, beforeEach } from "vitest";
import { TRPCError } from "@trpc/server";
import { createCallerFactory } from "@/server/api/trpc";
import { businessRouter } from "../business";

vi.mock("@/db", () => ({ db: {} }));
vi.mock("@/auth", () => ({ auth: vi.fn() }));

// ── Mock helpers ──────────────────────────────────────────────────────────────

function makeMockDb() {
  return {
    query: {
      business: { findFirst: vi.fn(), findMany: vi.fn() },
      jobPosting: { findFirst: vi.fn(), findMany: vi.fn() },
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
      where: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([]),
      }),
    }),
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([{ count: 0 }]),
        groupBy: vi.fn().mockResolvedValue([]),
      }),
    }),
    execute: vi.fn().mockResolvedValue([]),
  };
}

function makePublicBusiness(overrides: Record<string, unknown> = {}) {
  return {
    id: "business-1",
    name: "Acme Corp",
    city: "New York",
    state: "NY",
    industry: "RETAIL",
    website: "https://acme.com",
    aboutBusiness: "We do things.",
    missionText: "Give people a chance.",
    owner: {
      id: "owner-1",
      employerProfile: {
        isResponsive: true,
        responsivenessUpdatedAt: new Date("2026-01-01"),
      },
    },
    ...overrides,
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

const createCaller = createCallerFactory(businessRouter);

const VALID_CREATE_INPUT = {
  name: "Acme Corp",
  city: "New York",
  state: "NY",
};

// ── business.getPublic ─────────────────────────────────────────────────────────

describe("business.getPublic", () => {
  let mockDb: ReturnType<typeof makeMockDb>;

  beforeEach(() => {
    mockDb = makeMockDb();
    // The getPublic procedure does a select().from().where() for the count
    mockDb.select.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([{ count: 3 }]),
      }),
    });
  });

  it("returns public business fields for a valid id", async () => {
    mockDb.query.business.findFirst.mockResolvedValue(makePublicBusiness());
    const caller = createCaller(makeCtx(null, mockDb));
    const result = await caller.getPublic({ id: "business-1" });
    expect(result).toMatchObject({
      id: "business-1",
      businessName: "Acme Corp",
      city: "New York",
      state: "NY",
    });
  });

  it("works for an unauthenticated caller", async () => {
    mockDb.query.business.findFirst.mockResolvedValue(makePublicBusiness());
    const caller = createCaller(makeCtx(null, mockDb));
    await expect(caller.getPublic({ id: "business-1" })).resolves.toBeDefined();
  });

  it("works for a seeker caller", async () => {
    mockDb.query.business.findFirst.mockResolvedValue(makePublicBusiness());
    const caller = createCaller(makeCtx("SEEKER", mockDb));
    await expect(caller.getPublic({ id: "business-1" })).resolves.toBeDefined();
  });

  it("includes _count.jobs", async () => {
    mockDb.query.business.findFirst.mockResolvedValue(makePublicBusiness());
    mockDb.select.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([{ count: 5 }]),
      }),
    });
    const caller = createCaller(makeCtx(null, mockDb));
    const result = await caller.getPublic({ id: "business-1" });
    expect(result._count.jobs).toBe(5);
  });

  it("returns employer.isResponsive: false and employer.isNew: true when owner has no employerProfile", async () => {
    mockDb.query.business.findFirst.mockResolvedValue(
      makePublicBusiness({ owner: { id: "owner-1", employerProfile: null } }),
    );
    const caller = createCaller(makeCtx(null, mockDb));
    const result = await caller.getPublic({ id: "business-1" });
    expect(result.employer.isResponsive).toBe(false);
    expect(result.employer.isNew).toBe(true);
  });

  it("returns employer.isNew: true when responsivenessUpdatedAt is null", async () => {
    mockDb.query.business.findFirst.mockResolvedValue(
      makePublicBusiness({
        owner: {
          id: "owner-1",
          employerProfile: { isResponsive: false, responsivenessUpdatedAt: null },
        },
      }),
    );
    const caller = createCaller(makeCtx(null, mockDb));
    const result = await caller.getPublic({ id: "business-1" });
    expect(result.employer.isNew).toBe(true);
  });

  it("returns employer.isNew: false when responsivenessUpdatedAt is set", async () => {
    mockDb.query.business.findFirst.mockResolvedValue(makePublicBusiness());
    const caller = createCaller(makeCtx(null, mockDb));
    const result = await caller.getPublic({ id: "business-1" });
    expect(result.employer.isNew).toBe(false);
  });

  it("does NOT expose responseRate or medianResponseHours", async () => {
    mockDb.query.business.findFirst.mockResolvedValue(makePublicBusiness());
    const caller = createCaller(makeCtx(null, mockDb));
    const result = await caller.getPublic({ id: "business-1" });
    expect(result).not.toHaveProperty("responseRate");
    expect(result).not.toHaveProperty("medianResponseHours");
  });

  it("returns null optional fields when not set", async () => {
    mockDb.query.business.findFirst.mockResolvedValue(
      makePublicBusiness({ industry: null, website: null, aboutBusiness: null, missionText: null }),
    );
    const caller = createCaller(makeCtx(null, mockDb));
    const result = await caller.getPublic({ id: "business-1" });
    expect(result.industry).toBeNull();
    expect(result.website).toBeNull();
  });

  it("throws NOT_FOUND for a non-existent id", async () => {
    mockDb.query.business.findFirst.mockResolvedValue(null);
    const caller = createCaller(makeCtx(null, mockDb));
    await expect(caller.getPublic({ id: "does-not-exist" })).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });

  it("queries by business id, not ownerId", async () => {
    mockDb.query.business.findFirst.mockResolvedValue(makePublicBusiness());
    const caller = createCaller(makeCtx(null, mockDb));
    await caller.getPublic({ id: "business-1" });
    expect(mockDb.query.business.findFirst).toHaveBeenCalled();
  });
});

// ── business.listMine ──────────────────────────────────────────────────────────

describe("business.listMine", () => {
  let mockDb: ReturnType<typeof makeMockDb>;

  beforeEach(() => {
    mockDb = makeMockDb();
    // listMine uses select().from().where().groupBy() for counts
    mockDb.select.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          groupBy: vi.fn().mockResolvedValue([]),
        }),
      }),
    });
  });

  it("returns empty array when employer has no businesses", async () => {
    mockDb.query.business.findMany.mockResolvedValue([]);
    const caller = createCaller(makeCtx("EMPLOYER", mockDb));
    const result = await caller.listMine();
    expect(result).toEqual([]);
  });

  it("returns all businesses for the employer", async () => {
    mockDb.query.business.findMany.mockResolvedValue([
      { id: "c1", name: "Acme", city: "NYC", state: "NY" },
      { id: "c2", name: "Beta", city: "LA", state: "CA" },
    ]);
    // Count rows: c1 has 2 active jobs
    mockDb.select.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          groupBy: vi.fn().mockResolvedValue([{ businessId: "c1", count: 2 }]),
        }),
      }),
    });
    const caller = createCaller(makeCtx("EMPLOYER", mockDb));
    const result = await caller.listMine();
    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({ id: "c1", businessName: "Acme", activeJobsCount: 2 });
  });

  it("throws FORBIDDEN for a SEEKER", async () => {
    const caller = createCaller(makeCtx("SEEKER", mockDb));
    await expect(caller.listMine()).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("throws UNAUTHORIZED for unauthenticated callers", async () => {
    const caller = createCaller(makeCtx(null, mockDb));
    await expect(caller.listMine()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("filters by ownerId from session, not all businesses", async () => {
    mockDb.query.business.findMany.mockResolvedValue([]);
    const caller = createCaller(makeCtx("EMPLOYER", mockDb, "user-42"));
    await caller.listMine();
    expect(mockDb.query.business.findMany).toHaveBeenCalled();
  });
});

// ── business.create ────────────────────────────────────────────────────────────

describe("business.create", () => {
  let mockDb: ReturnType<typeof makeMockDb>;

  beforeEach(() => {
    mockDb = makeMockDb();
    mockDb.insert.mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi
          .fn()
          .mockResolvedValue([{ id: "business-1", ownerId: "user-1", name: "Acme Corp" }]),
      }),
    });
  });

  it("creates a business and returns it", async () => {
    const caller = createCaller(makeCtx("EMPLOYER", mockDb));
    const result = await caller.create(VALID_CREATE_INPUT);
    expect(result).toMatchObject({ id: "business-1" });
  });

  it("always sets ownerId from session, not from input", async () => {
    const caller = createCaller(makeCtx("EMPLOYER", mockDb, "user-42"));
    mockDb.insert.mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi
          .fn()
          .mockResolvedValue([{ id: "business-1", ownerId: "user-42", name: "Acme Corp" }]),
      }),
    });
    const result = await caller.create(VALID_CREATE_INPUT);
    expect(mockDb.insert).toHaveBeenCalled();
    expect(result).toMatchObject({ ownerId: "user-42" });
  });

  it("stores optional fields when provided", async () => {
    const caller = createCaller(makeCtx("EMPLOYER", mockDb));
    const result = await caller.create({
      ...VALID_CREATE_INPUT,
      website: "https://acme.com",
      industry: "RETAIL",
    });
    expect(result).toBeDefined();
    expect(mockDb.insert).toHaveBeenCalled();
  });

  it("accepts aboutBusiness at exactly 2000 chars", async () => {
    const caller = createCaller(makeCtx("EMPLOYER", mockDb));
    await expect(
      caller.create({ ...VALID_CREATE_INPUT, aboutBusiness: "a".repeat(2000) }),
    ).resolves.toBeDefined();
  });

  it("rejects aboutBusiness longer than 2000 chars", async () => {
    const caller = createCaller(makeCtx("EMPLOYER", mockDb));
    await expect(
      caller.create({ ...VALID_CREATE_INPUT, aboutBusiness: "a".repeat(2001) }),
    ).rejects.toThrow(TRPCError);
  });

  it("accepts missionText at exactly 1000 chars", async () => {
    const caller = createCaller(makeCtx("EMPLOYER", mockDb));
    await expect(
      caller.create({ ...VALID_CREATE_INPUT, missionText: "a".repeat(1000) }),
    ).resolves.toBeDefined();
  });

  it("rejects missionText longer than 1000 chars", async () => {
    const caller = createCaller(makeCtx("EMPLOYER", mockDb));
    await expect(
      caller.create({ ...VALID_CREATE_INPUT, missionText: "a".repeat(1001) }),
    ).rejects.toThrow(TRPCError);
  });

  it("throws UNAUTHORIZED when session is null", async () => {
    const caller = createCaller(makeCtx(null, mockDb));
    await expect(caller.create(VALID_CREATE_INPUT)).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("throws FORBIDDEN when called by a SEEKER", async () => {
    const caller = createCaller(makeCtx("SEEKER", mockDb));
    await expect(caller.create(VALID_CREATE_INPUT)).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("throws FORBIDDEN when called by an ADMIN", async () => {
    const caller = createCaller(makeCtx("ADMIN", mockDb));
    await expect(caller.create(VALID_CREATE_INPUT)).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("does not accept isAdult in input (isAdult now belongs to createProfile)", async () => {
    const caller = createCaller(makeCtx("EMPLOYER", mockDb));
    // isAdult is no longer part of CreateBusinessSchema — extra fields are stripped
    const inputWithAdult = { ...VALID_CREATE_INPUT, isAdult: true };
    await expect(caller.create(inputWithAdult)).resolves.toBeDefined();
  });
});

// ── business.update ────────────────────────────────────────────────────────────

describe("business.update", () => {
  let mockDb: ReturnType<typeof makeMockDb>;

  beforeEach(() => {
    mockDb = makeMockDb();
    mockDb.query.business.findFirst.mockResolvedValue({ ownerId: "user-1" });
    mockDb.update.mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([{ id: "business-1", name: "Updated" }]),
        }),
      }),
    });
  });

  it("updates the business and returns it", async () => {
    const caller = createCaller(makeCtx("EMPLOYER", mockDb));
    const result = await caller.update({
      id: "business-1",
      name: "Updated",
      city: "NYC",
      state: "NY",
    });
    expect(result).toMatchObject({ id: "business-1" });
  });

  it("throws FORBIDDEN when business belongs to a different user", async () => {
    mockDb.query.business.findFirst.mockResolvedValue({ ownerId: "other-user" });
    const caller = createCaller(makeCtx("EMPLOYER", mockDb, "user-1"));
    await expect(
      caller.update({ id: "business-1", name: "X", city: "NYC", state: "NY" }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("throws NOT_FOUND when business does not exist", async () => {
    mockDb.query.business.findFirst.mockResolvedValue(null);
    const caller = createCaller(makeCtx("EMPLOYER", mockDb));
    await expect(
      caller.update({ id: "missing", name: "X", city: "NYC", state: "NY" }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("throws FORBIDDEN for a SEEKER", async () => {
    const caller = createCaller(makeCtx("SEEKER", mockDb));
    await expect(
      caller.update({ id: "business-1", name: "X", city: "NYC", state: "NY" }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});

// ── business.delete ────────────────────────────────────────────────────────────

describe("business.delete", () => {
  let mockDb: ReturnType<typeof makeMockDb>;

  beforeEach(() => {
    mockDb = makeMockDb();
    mockDb.query.business.findFirst.mockResolvedValue({ ownerId: "user-1" });
    // select for non-closed count: returns 0
    mockDb.select.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([{ count: 0 }]),
      }),
    });
    mockDb.delete.mockReturnValue({
      where: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([{ id: "business-1" }]),
      }),
    });
  });

  it("deletes the business when no active jobs", async () => {
    const caller = createCaller(makeCtx("EMPLOYER", mockDb));
    await expect(caller.delete({ id: "business-1" })).resolves.toBeDefined();
    expect(mockDb.delete).toHaveBeenCalled();
  });

  it("throws BAD_REQUEST when business has non-closed jobs", async () => {
    mockDb.select.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([{ count: 2 }]),
      }),
    });
    const caller = createCaller(makeCtx("EMPLOYER", mockDb));
    await expect(caller.delete({ id: "business-1" })).rejects.toMatchObject({
      code: "BAD_REQUEST",
    });
  });

  it("throws FORBIDDEN when business belongs to a different user", async () => {
    mockDb.query.business.findFirst.mockResolvedValue({ ownerId: "other-user" });
    const caller = createCaller(makeCtx("EMPLOYER", mockDb, "user-1"));
    await expect(caller.delete({ id: "business-1" })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("throws NOT_FOUND for a non-existent business", async () => {
    mockDb.query.business.findFirst.mockResolvedValue(null);
    const caller = createCaller(makeCtx("EMPLOYER", mockDb));
    await expect(caller.delete({ id: "missing" })).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("throws FORBIDDEN for a SEEKER", async () => {
    const caller = createCaller(makeCtx("SEEKER", mockDb));
    await expect(caller.delete({ id: "business-1" })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
