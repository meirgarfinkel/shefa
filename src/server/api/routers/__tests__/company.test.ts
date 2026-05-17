import { describe, it, expect, vi, beforeEach } from "vitest";
import { TRPCError } from "@trpc/server";
import { createCallerFactory } from "@/server/api/trpc";
import { companyRouter } from "../company";

vi.mock("@/lib/prisma", () => ({ prisma: {} }));
vi.mock("@/auth", () => ({ auth: vi.fn() }));

// ── Mock helpers ──────────────────────────────────────────────────────────────

function makeMockPrisma() {
  return {
    company: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  };
}

function makePublicCompany(overrides: Record<string, unknown> = {}) {
  return {
    id: "company-1",
    name: "Acme Corp",
    city: "New York",
    state: "NY",
    industry: "RETAIL",
    website: "https://acme.com",
    aboutCompany: "We do things.",
    missionText: "Give people a chance.",
    owner: {
      employerProfile: {
        isResponsive: true,
        responsivenessUpdatedAt: new Date("2026-01-01"),
      },
    },
    _count: { jobs: 3 },
    ...overrides,
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

const createCaller = createCallerFactory(companyRouter);

const VALID_CREATE_INPUT = {
  name: "Acme Corp",
  city: "New York",
  state: "NY",
};

// ── company.getPublic ─────────────────────────────────────────────────────────

describe("company.getPublic", () => {
  let db: ReturnType<typeof makeMockPrisma>;

  beforeEach(() => {
    db = makeMockPrisma();
  });

  it("returns public company fields for a valid id", async () => {
    db.company.findUnique.mockResolvedValue(makePublicCompany());
    const caller = createCaller(makeCtx(null, db));
    const result = await caller.getPublic({ id: "company-1" });
    expect(result).toMatchObject({
      id: "company-1",
      companyName: "Acme Corp",
      city: "New York",
      state: "NY",
      isResponsive: true,
    });
  });

  it("works for an unauthenticated caller", async () => {
    db.company.findUnique.mockResolvedValue(makePublicCompany());
    const caller = createCaller(makeCtx(null, db));
    await expect(caller.getPublic({ id: "company-1" })).resolves.toBeDefined();
  });

  it("works for a seeker caller", async () => {
    db.company.findUnique.mockResolvedValue(makePublicCompany());
    const caller = createCaller(makeCtx("SEEKER", db));
    await expect(caller.getPublic({ id: "company-1" })).resolves.toBeDefined();
  });

  it("includes _count.jobs", async () => {
    db.company.findUnique.mockResolvedValue(makePublicCompany({ _count: { jobs: 5 } }));
    const caller = createCaller(makeCtx(null, db));
    const result = await caller.getPublic({ id: "company-1" });
    expect(result._count.jobs).toBe(5);
  });

  it("returns isResponsive: false and isNew: true when owner has no employerProfile", async () => {
    db.company.findUnique.mockResolvedValue(
      makePublicCompany({ owner: { employerProfile: null } }),
    );
    const caller = createCaller(makeCtx(null, db));
    const result = await caller.getPublic({ id: "company-1" });
    expect(result.isResponsive).toBe(false);
    expect(result.isNew).toBe(true);
  });

  it("returns isNew: true when responsivenessUpdatedAt is null", async () => {
    db.company.findUnique.mockResolvedValue(
      makePublicCompany({
        owner: { employerProfile: { isResponsive: false, responsivenessUpdatedAt: null } },
      }),
    );
    const caller = createCaller(makeCtx(null, db));
    const result = await caller.getPublic({ id: "company-1" });
    expect(result.isNew).toBe(true);
  });

  it("returns isNew: false when responsivenessUpdatedAt is set", async () => {
    db.company.findUnique.mockResolvedValue(makePublicCompany());
    const caller = createCaller(makeCtx(null, db));
    const result = await caller.getPublic({ id: "company-1" });
    expect(result.isNew).toBe(false);
  });

  it("does NOT expose responseRate or medianResponseHours", async () => {
    db.company.findUnique.mockResolvedValue(makePublicCompany());
    const caller = createCaller(makeCtx(null, db));
    const result = await caller.getPublic({ id: "company-1" });
    expect(result).not.toHaveProperty("responseRate");
    expect(result).not.toHaveProperty("medianResponseHours");
  });

  it("returns null optional fields when not set", async () => {
    db.company.findUnique.mockResolvedValue(
      makePublicCompany({ industry: null, website: null, aboutCompany: null, missionText: null }),
    );
    const caller = createCaller(makeCtx(null, db));
    const result = await caller.getPublic({ id: "company-1" });
    expect(result.industry).toBeNull();
    expect(result.website).toBeNull();
  });

  it("throws NOT_FOUND for a non-existent id", async () => {
    db.company.findUnique.mockResolvedValue(null);
    const caller = createCaller(makeCtx(null, db));
    await expect(caller.getPublic({ id: "does-not-exist" })).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });

  it("queries by company id, not ownerId", async () => {
    db.company.findUnique.mockResolvedValue(makePublicCompany());
    const caller = createCaller(makeCtx(null, db));
    await caller.getPublic({ id: "company-1" });
    expect(db.company.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "company-1" } }),
    );
  });
});

// ── company.listMine ──────────────────────────────────────────────────────────

describe("company.listMine", () => {
  let db: ReturnType<typeof makeMockPrisma>;

  beforeEach(() => {
    db = makeMockPrisma();
  });

  it("returns empty array when employer has no companies", async () => {
    db.company.findMany.mockResolvedValue([]);
    const caller = createCaller(makeCtx("EMPLOYER", db));
    const result = await caller.listMine();
    expect(result).toEqual([]);
  });

  it("returns all companies for the employer", async () => {
    db.company.findMany.mockResolvedValue([
      { id: "c1", name: "Acme", city: "NYC", state: "NY", _count: { jobs: 2 } },
      { id: "c2", name: "Beta", city: "LA", state: "CA", _count: { jobs: 0 } },
    ]);
    const caller = createCaller(makeCtx("EMPLOYER", db));
    const result = await caller.listMine();
    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({ id: "c1", companyName: "Acme", activeJobsCount: 2 });
  });

  it("throws FORBIDDEN for a SEEKER", async () => {
    const caller = createCaller(makeCtx("SEEKER", db));
    await expect(caller.listMine()).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("throws UNAUTHORIZED for unauthenticated callers", async () => {
    const caller = createCaller(makeCtx(null, db));
    await expect(caller.listMine()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("filters by ownerId from session, not all companies", async () => {
    db.company.findMany.mockResolvedValue([]);
    const caller = createCaller(makeCtx("EMPLOYER", db, "user-42"));
    await caller.listMine();
    expect(db.company.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { ownerId: "user-42" } }),
    );
  });
});

// ── company.create ────────────────────────────────────────────────────────────

describe("company.create", () => {
  let db: ReturnType<typeof makeMockPrisma>;

  beforeEach(() => {
    db = makeMockPrisma();
    db.company.create.mockResolvedValue({ id: "company-1", ownerId: "user-1", name: "Acme Corp" });
  });

  it("creates a company and returns it", async () => {
    const caller = createCaller(makeCtx("EMPLOYER", db));
    const result = await caller.create(VALID_CREATE_INPUT);
    expect(result).toMatchObject({ id: "company-1" });
  });

  it("always sets ownerId from session, not from input", async () => {
    const caller = createCaller(makeCtx("EMPLOYER", db, "user-42"));
    await caller.create(VALID_CREATE_INPUT);
    const data = db.company.create.mock.calls[0][0].data;
    expect(data.ownerId).toBe("user-42");
  });

  it("stores optional fields when provided", async () => {
    const caller = createCaller(makeCtx("EMPLOYER", db));
    await caller.create({ ...VALID_CREATE_INPUT, website: "https://acme.com", industry: "RETAIL" });
    const data = db.company.create.mock.calls[0][0].data;
    expect(data.website).toBe("https://acme.com");
    expect(data.industry).toBe("RETAIL");
  });

  it("accepts aboutCompany at exactly 2000 chars", async () => {
    const caller = createCaller(makeCtx("EMPLOYER", db));
    await expect(
      caller.create({ ...VALID_CREATE_INPUT, aboutCompany: "a".repeat(2000) }),
    ).resolves.toBeDefined();
  });

  it("rejects aboutCompany longer than 2000 chars", async () => {
    const caller = createCaller(makeCtx("EMPLOYER", db));
    await expect(
      caller.create({ ...VALID_CREATE_INPUT, aboutCompany: "a".repeat(2001) }),
    ).rejects.toThrow(TRPCError);
  });

  it("accepts missionText at exactly 1000 chars", async () => {
    const caller = createCaller(makeCtx("EMPLOYER", db));
    await expect(
      caller.create({ ...VALID_CREATE_INPUT, missionText: "a".repeat(1000) }),
    ).resolves.toBeDefined();
  });

  it("rejects missionText longer than 1000 chars", async () => {
    const caller = createCaller(makeCtx("EMPLOYER", db));
    await expect(
      caller.create({ ...VALID_CREATE_INPUT, missionText: "a".repeat(1001) }),
    ).rejects.toThrow(TRPCError);
  });

  it("throws UNAUTHORIZED when session is null", async () => {
    const caller = createCaller(makeCtx(null, db));
    await expect(caller.create(VALID_CREATE_INPUT)).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("throws FORBIDDEN when called by a SEEKER", async () => {
    const caller = createCaller(makeCtx("SEEKER", db));
    await expect(caller.create(VALID_CREATE_INPUT)).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("throws FORBIDDEN when called by an ADMIN", async () => {
    const caller = createCaller(makeCtx("ADMIN", db));
    await expect(caller.create(VALID_CREATE_INPUT)).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("does not accept isAdult in input (isAdult now belongs to createProfile)", async () => {
    const caller = createCaller(makeCtx("EMPLOYER", db));
    // isAdult is no longer part of CreateCompanySchema — extra fields are stripped
    const inputWithAdult = { ...VALID_CREATE_INPUT, isAdult: true };
    await expect(caller.create(inputWithAdult)).resolves.toBeDefined();
    const data = db.company.create.mock.calls[0][0].data;
    expect(data).not.toHaveProperty("isAdult");
  });
});

// ── company.update ────────────────────────────────────────────────────────────

describe("company.update", () => {
  let db: ReturnType<typeof makeMockPrisma>;

  beforeEach(() => {
    db = makeMockPrisma();
    db.company.findUnique.mockResolvedValue({ ownerId: "user-1" });
    db.company.update.mockResolvedValue({ id: "company-1", name: "Updated" });
  });

  it("updates the company and returns it", async () => {
    const caller = createCaller(makeCtx("EMPLOYER", db));
    const result = await caller.update({
      id: "company-1",
      name: "Updated",
      city: "NYC",
      state: "NY",
    });
    expect(result).toMatchObject({ id: "company-1" });
  });

  it("throws FORBIDDEN when company belongs to a different user", async () => {
    db.company.findUnique.mockResolvedValue({ ownerId: "other-user" });
    const caller = createCaller(makeCtx("EMPLOYER", db, "user-1"));
    await expect(
      caller.update({ id: "company-1", name: "X", city: "NYC", state: "NY" }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("throws NOT_FOUND when company does not exist", async () => {
    db.company.findUnique.mockResolvedValue(null);
    const caller = createCaller(makeCtx("EMPLOYER", db));
    await expect(
      caller.update({ id: "missing", name: "X", city: "NYC", state: "NY" }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("throws FORBIDDEN for a SEEKER", async () => {
    const caller = createCaller(makeCtx("SEEKER", db));
    await expect(
      caller.update({ id: "company-1", name: "X", city: "NYC", state: "NY" }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});

// ── company.delete ────────────────────────────────────────────────────────────

describe("company.delete", () => {
  let db: ReturnType<typeof makeMockPrisma>;

  beforeEach(() => {
    db = makeMockPrisma();
    db.company.findUnique.mockResolvedValue({ ownerId: "user-1", _count: { jobs: 0 } });
    db.company.delete.mockResolvedValue({ id: "company-1" });
  });

  it("deletes the company when no active jobs", async () => {
    const caller = createCaller(makeCtx("EMPLOYER", db));
    await expect(caller.delete({ id: "company-1" })).resolves.toBeDefined();
    expect(db.company.delete).toHaveBeenCalledWith({ where: { id: "company-1" } });
  });

  it("throws BAD_REQUEST when company has non-closed jobs", async () => {
    db.company.findUnique.mockResolvedValue({ ownerId: "user-1", _count: { jobs: 2 } });
    const caller = createCaller(makeCtx("EMPLOYER", db));
    await expect(caller.delete({ id: "company-1" })).rejects.toMatchObject({
      code: "BAD_REQUEST",
    });
  });

  it("throws FORBIDDEN when company belongs to a different user", async () => {
    db.company.findUnique.mockResolvedValue({ ownerId: "other-user", _count: { jobs: 0 } });
    const caller = createCaller(makeCtx("EMPLOYER", db, "user-1"));
    await expect(caller.delete({ id: "company-1" })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("throws NOT_FOUND for a non-existent company", async () => {
    db.company.findUnique.mockResolvedValue(null);
    const caller = createCaller(makeCtx("EMPLOYER", db));
    await expect(caller.delete({ id: "missing" })).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("throws FORBIDDEN for a SEEKER", async () => {
    const caller = createCaller(makeCtx("SEEKER", db));
    await expect(caller.delete({ id: "company-1" })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
