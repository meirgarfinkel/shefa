import { describe, it, expect, vi, beforeEach } from "vitest";
import { TRPCError } from "@trpc/server";
import { createCallerFactory } from "@/server/api/trpc";
import { employerRouter } from "../employer";

vi.mock("@/lib/prisma", () => ({ prisma: {} }));
vi.mock("@/auth", () => ({ auth: vi.fn() }));

// ── Mock helpers ──────────────────────────────────────────────────────────────

function makeMockPrisma() {
  return {
    user: {
      update: vi.fn().mockResolvedValue({}),
    },
    employerProfile: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
  };
}

function makePublicProfile(overrides: Record<string, unknown> = {}) {
  return {
    id: "profile-1",
    companyName: "Acme Corp",
    city: "New York",
    state: "NY",
    industry: "RETAIL",
    website: "https://acme.com",
    aboutCompany: "We do things.",
    missionText: "Give people a chance.",
    isResponsive: true,
    responsivenessUpdatedAt: new Date("2026-01-01"),
    status: "ACTIVE",
    _count: { jobPostings: 3 },
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

const createCaller = createCallerFactory(employerRouter);

const VALID_INPUT = {
  firstName: "Bob",
  lastName: "Smith",
  isAdult: true as const,
  companyName: "Acme Corp",
  companySize: "SIZE_1_10" as const,
  city: "New York",
  state: "NY",
  zip: "10001",
};

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("employer.createProfile", () => {
  let db: ReturnType<typeof makeMockPrisma>;

  beforeEach(() => {
    db = makeMockPrisma();
    db.employerProfile.findUnique.mockResolvedValue(null);
    db.employerProfile.create.mockResolvedValue({ id: "profile-1", userId: "user-1" });
  });

  // ── Happy path ──

  it("creates a profile and returns it", async () => {
    const caller = createCaller(makeCtx("EMPLOYER", db));
    const result = await caller.createProfile(VALID_INPUT);
    expect(result).toMatchObject({ id: "profile-1" });
  });

  it("always sets userId from session, not from input", async () => {
    const caller = createCaller(makeCtx("EMPLOYER", db, "user-1"));
    await caller.createProfile(VALID_INPUT);
    const data = db.employerProfile.create.mock.calls[0][0].data;
    expect(data.userId).toBe("user-1");
  });

  it("stores optional fields when provided", async () => {
    const caller = createCaller(makeCtx("EMPLOYER", db));
    await caller.createProfile({ ...VALID_INPUT, website: "https://acme.com", industry: "RETAIL" });
    const data = db.employerProfile.create.mock.calls[0][0].data;
    expect(data.website).toBe("https://acme.com");
    expect(data.industry).toBe("RETAIL");
  });

  // ── Boundary cases ──

  it("accepts aboutCompany at exactly 2000 chars", async () => {
    const caller = createCaller(makeCtx("EMPLOYER", db));
    await expect(
      caller.createProfile({ ...VALID_INPUT, aboutCompany: "a".repeat(2000) }),
    ).resolves.toBeDefined();
  });

  it("rejects aboutCompany longer than 2000 chars", async () => {
    const caller = createCaller(makeCtx("EMPLOYER", db));
    await expect(
      caller.createProfile({ ...VALID_INPUT, aboutCompany: "a".repeat(2001) }),
    ).rejects.toThrow(TRPCError);
  });

  it("accepts missionText at exactly 1000 chars", async () => {
    const caller = createCaller(makeCtx("EMPLOYER", db));
    await expect(
      caller.createProfile({ ...VALID_INPUT, missionText: "a".repeat(1000) }),
    ).resolves.toBeDefined();
  });

  it("rejects missionText longer than 1000 chars", async () => {
    const caller = createCaller(makeCtx("EMPLOYER", db));
    await expect(
      caller.createProfile({ ...VALID_INPUT, missionText: "a".repeat(1001) }),
    ).rejects.toThrow(TRPCError);
  });

  // ── Adversarial ──

  it("throws UNAUTHORIZED when session is null", async () => {
    const caller = createCaller(makeCtx(null, db));
    await expect(caller.createProfile(VALID_INPUT)).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
  });

  it("throws FORBIDDEN when called by a SEEKER", async () => {
    const caller = createCaller(makeCtx("SEEKER", db));
    await expect(caller.createProfile(VALID_INPUT)).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });

  it("throws FORBIDDEN when called by an ADMIN", async () => {
    const caller = createCaller(makeCtx("ADMIN", db));
    await expect(caller.createProfile(VALID_INPUT)).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });

  // ── Duplicate ──

  it("throws CONFLICT when a profile already exists", async () => {
    db.employerProfile.findUnique.mockResolvedValue({ id: "existing" });
    const caller = createCaller(makeCtx("EMPLOYER", db));
    await expect(caller.createProfile(VALID_INPUT)).rejects.toMatchObject({
      code: "CONFLICT",
    });
  });
});

describe("employer.getPublicProfile", () => {
  let db: ReturnType<typeof makeMockPrisma>;

  beforeEach(() => {
    db = makeMockPrisma();
  });

  // ── Happy path ──

  it("returns public profile fields for a valid id", async () => {
    db.employerProfile.findUnique.mockResolvedValue(makePublicProfile());
    const caller = createCaller(makeCtx(null, db));
    const result = await caller.getPublicProfile({ id: "profile-1" });
    expect(result).toMatchObject({
      id: "profile-1",
      companyName: "Acme Corp",
      city: "New York",
      state: "NY",
      isResponsive: true,
    });
  });

  it("works for an unauthenticated caller", async () => {
    db.employerProfile.findUnique.mockResolvedValue(makePublicProfile());
    const caller = createCaller(makeCtx(null, db));
    await expect(caller.getPublicProfile({ id: "profile-1" })).resolves.toBeDefined();
  });

  it("works for a seeker caller", async () => {
    db.employerProfile.findUnique.mockResolvedValue(makePublicProfile());
    const caller = createCaller(makeCtx("SEEKER", db));
    await expect(caller.getPublicProfile({ id: "profile-1" })).resolves.toBeDefined();
  });

  it("includes _count.jobPostings", async () => {
    db.employerProfile.findUnique.mockResolvedValue(
      makePublicProfile({ _count: { jobPostings: 5 } }),
    );
    const caller = createCaller(makeCtx(null, db));
    const result = await caller.getPublicProfile({ id: "profile-1" });
    expect(result._count.jobPostings).toBe(5);
  });

  it("returns isResponsive: false when employer has no scored conversations", async () => {
    db.employerProfile.findUnique.mockResolvedValue(makePublicProfile({ isResponsive: false }));
    const caller = createCaller(makeCtx(null, db));
    const result = await caller.getPublicProfile({ id: "profile-1" });
    expect(result.isResponsive).toBe(false);
  });

  it("does NOT expose responseRate or medianResponseHours or responsivenessScore", async () => {
    db.employerProfile.findUnique.mockResolvedValue(
      makePublicProfile({
        responseRate: 0.9,
        medianResponseHours: 12,
        responsivenessScore: 0.9,
      }),
    );
    const caller = createCaller(makeCtx(null, db));
    const result = await caller.getPublicProfile({ id: "profile-1" });
    expect(result).not.toHaveProperty("responseRate");
    expect(result).not.toHaveProperty("medianResponseHours");
    expect(result).not.toHaveProperty("responsivenessScore");
    expect(result).not.toHaveProperty("responsivenessUpdatedAt");
  });

  it("sets isNew: true when responsivenessUpdatedAt is null", async () => {
    db.employerProfile.findUnique.mockResolvedValue(
      makePublicProfile({ responsivenessUpdatedAt: null }),
    );
    const caller = createCaller(makeCtx(null, db));
    const result = await caller.getPublicProfile({ id: "profile-1" });
    expect(result.isNew).toBe(true);
  });

  it("sets isNew: false when responsivenessUpdatedAt is set", async () => {
    db.employerProfile.findUnique.mockResolvedValue(
      makePublicProfile({ responsivenessUpdatedAt: new Date("2026-01-01") }),
    );
    const caller = createCaller(makeCtx(null, db));
    const result = await caller.getPublicProfile({ id: "profile-1" });
    expect(result.isNew).toBe(false);
  });

  it("returns profile even when status is PAUSED", async () => {
    db.employerProfile.findUnique.mockResolvedValue(makePublicProfile({ status: "PAUSED" }));
    const caller = createCaller(makeCtx(null, db));
    await expect(caller.getPublicProfile({ id: "profile-1" })).resolves.toBeDefined();
  });

  // ── Boundary cases ──

  it("returns null optional fields when not set", async () => {
    db.employerProfile.findUnique.mockResolvedValue(
      makePublicProfile({ industry: null, website: null, aboutCompany: null, missionText: null }),
    );
    const caller = createCaller(makeCtx(null, db));
    const result = await caller.getPublicProfile({ id: "profile-1" });
    expect(result.industry).toBeNull();
    expect(result.website).toBeNull();
  });

  it("returns _count.jobPostings as 0 when no postings", async () => {
    db.employerProfile.findUnique.mockResolvedValue(
      makePublicProfile({ _count: { jobPostings: 0 } }),
    );
    const caller = createCaller(makeCtx(null, db));
    const result = await caller.getPublicProfile({ id: "profile-1" });
    expect(result._count.jobPostings).toBe(0);
  });

  // ── Adversarial ──

  it("throws NOT_FOUND for a non-existent id", async () => {
    db.employerProfile.findUnique.mockResolvedValue(null);
    const caller = createCaller(makeCtx(null, db));
    await expect(caller.getPublicProfile({ id: "does-not-exist" })).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });

  it("throws NOT_FOUND for an empty string id", async () => {
    db.employerProfile.findUnique.mockResolvedValue(null);
    const caller = createCaller(makeCtx(null, db));
    await expect(caller.getPublicProfile({ id: "" })).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });

  it("queries by profile id, not userId", async () => {
    db.employerProfile.findUnique.mockResolvedValue(makePublicProfile());
    const caller = createCaller(makeCtx(null, db));
    await caller.getPublicProfile({ id: "profile-1" });
    expect(db.employerProfile.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "profile-1" } }),
    );
  });
});
