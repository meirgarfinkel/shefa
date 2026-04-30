import { describe, it, expect, vi, beforeEach } from "vitest";
import { TRPCError } from "@trpc/server";
import { createCallerFactory } from "@/server/api/trpc";
import { seekerRouter } from "../seeker";

vi.mock("@/lib/prisma", () => ({ prisma: {} }));
vi.mock("@/auth", () => ({ auth: vi.fn() }));

// ── Mock helpers ──────────────────────────────────────────────────────────────

function makeMockPrisma() {
  return {
    user: {
      update: vi.fn().mockResolvedValue({}),
    },
    seekerProfile: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
  };
}

function makePublicSeekerProfile(overrides: Record<string, unknown> = {}) {
  return {
    id: "sp-1",
    firstName: "Jane",
    lastName: "Doe",
    city: "Brooklyn",
    state: "NY",
    zip: "11201",
    workAuthorization: true,
    availableDays: ["MON", "TUE"],
    jobSeekText: "I want to learn to cook.",
    educationLevel: null,
    otherSkills: null,
    otherLanguages: null,
    about: null,
    isResponsive: false,
    responseRate: null,
    medianResponseHours: null,
    userId: "user-secret",
    status: "ACTIVE",
    createdAt: new Date("2026-01-01"),
    updatedAt: new Date("2026-01-01"),
    lastVerifiedAt: new Date("2026-01-01"),
    skills: [{ skill: { name: "Cooking" } }, { skill: { name: "Customer Service" } }],
    languages: [{ language: { name: "Spanish" } }],
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

const createCaller = createCallerFactory(seekerRouter);

const VALID_INPUT = {
  firstName: "Jane",
  lastName: "Doe",
  city: "Brooklyn",
  state: "NY",
  zip: "11201",
  workAuthorization: true,
  isAdult: true as const,
  availableDays: ["MON", "TUE", "WED"] as Array<
    "SUN" | "MON" | "TUE" | "WED" | "THU" | "FRI" | "SAT"
  >,
  jobSeekText: "I want to learn to cook and work in a restaurant.",
};

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("seeker.createProfile", () => {
  let db: ReturnType<typeof makeMockPrisma>;

  beforeEach(() => {
    db = makeMockPrisma();
    db.seekerProfile.findUnique.mockResolvedValue(null);
    db.seekerProfile.create.mockResolvedValue({ id: "profile-1", userId: "user-1" });
  });

  // ── Happy path ──

  it("creates a profile and returns it", async () => {
    const caller = createCaller(makeCtx("SEEKER", db));
    const result = await caller.createProfile(VALID_INPUT);
    expect(result).toMatchObject({ id: "profile-1" });
  });

  it("always sets userId from session, not from input", async () => {
    const caller = createCaller(makeCtx("SEEKER", db, "user-1"));
    await caller.createProfile(VALID_INPUT);
    const data = db.seekerProfile.create.mock.calls[0][0].data;
    expect(data.userId).toBe("user-1");
  });

  it("stores optional fields when provided", async () => {
    const caller = createCaller(makeCtx("SEEKER", db));
    await caller.createProfile({ ...VALID_INPUT, about: "Hello", educationLevel: "HIGH_SCHOOL" });
    const data = db.seekerProfile.create.mock.calls[0][0].data;
    expect(data.about).toBe("Hello");
    expect(data.educationLevel).toBe("HIGH_SCHOOL");
  });

  it("omits optional fields when not provided", async () => {
    const caller = createCaller(makeCtx("SEEKER", db));
    await caller.createProfile(VALID_INPUT);
    const data = db.seekerProfile.create.mock.calls[0][0].data;
    expect(data.about).toBeUndefined();
    expect(data.educationLevel).toBeUndefined();
  });

  // ── Boundary cases ──

  it("accepts jobSeekText at exactly 1000 chars", async () => {
    const caller = createCaller(makeCtx("SEEKER", db));
    await expect(
      caller.createProfile({ ...VALID_INPUT, jobSeekText: "a".repeat(1000) }),
    ).resolves.toBeDefined();
  });

  it("rejects jobSeekText longer than 1000 chars", async () => {
    const caller = createCaller(makeCtx("SEEKER", db));
    await expect(
      caller.createProfile({ ...VALID_INPUT, jobSeekText: "a".repeat(1001) }),
    ).rejects.toThrow(TRPCError);
  });

  it("accepts an empty availableDays array", async () => {
    const caller = createCaller(makeCtx("SEEKER", db));
    await expect(
      caller.createProfile({ ...VALID_INPUT, availableDays: [] }),
    ).resolves.toBeDefined();
  });

  it("deduplicates repeated availableDays values", async () => {
    const caller = createCaller(makeCtx("SEEKER", db));
    await caller.createProfile({
      ...VALID_INPUT,
      availableDays: ["MON", "MON", "TUE"] as Array<
        "SUN" | "MON" | "TUE" | "WED" | "THU" | "FRI" | "SAT"
      >,
    });
    const data = db.seekerProfile.create.mock.calls[0][0].data;
    expect(data.availableDays).toEqual(["MON", "TUE"]);
  });

  it("preserves zip codes with leading zeros", async () => {
    const caller = createCaller(makeCtx("SEEKER", db));
    await caller.createProfile({ ...VALID_INPUT, zip: "01234" });
    const data = db.seekerProfile.create.mock.calls[0][0].data;
    expect(data.zip).toBe("01234");
  });

  // ── Adversarial ──

  it("throws UNAUTHORIZED when session is null", async () => {
    const caller = createCaller(makeCtx(null, db));
    await expect(caller.createProfile(VALID_INPUT)).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
  });

  it("throws FORBIDDEN when called by an EMPLOYER", async () => {
    const caller = createCaller(makeCtx("EMPLOYER", db));
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
    db.seekerProfile.findUnique.mockResolvedValue({ id: "existing" });
    const caller = createCaller(makeCtx("SEEKER", db));
    await expect(caller.createProfile(VALID_INPUT)).rejects.toMatchObject({
      code: "CONFLICT",
    });
  });
});

// ── seeker.getPublicProfile ───────────────────────────────────────────────────

describe("seeker.getPublicProfile", () => {
  let db: ReturnType<typeof makeMockPrisma>;

  beforeEach(() => {
    db = makeMockPrisma();
  });

  // ── Happy path ──

  it("returns public profile for an active seeker", async () => {
    db.seekerProfile.findUnique.mockResolvedValue(makePublicSeekerProfile());
    const caller = createCaller(makeCtx(null, db));
    const result = await caller.getPublicProfile({ id: "sp-1" });
    expect(result).toMatchObject({
      id: "sp-1",
      firstName: "Jane",
      lastName: "Doe",
      city: "Brooklyn",
      state: "NY",
      status: "ACTIVE",
    });
  });

  it("returns skills as a flat array of names", async () => {
    db.seekerProfile.findUnique.mockResolvedValue(makePublicSeekerProfile());
    const caller = createCaller(makeCtx(null, db));
    const result = await caller.getPublicProfile({ id: "sp-1" });
    expect(result.skills).toEqual(["Cooking", "Customer Service"]);
  });

  it("returns languages as a flat array of names", async () => {
    db.seekerProfile.findUnique.mockResolvedValue(makePublicSeekerProfile());
    const caller = createCaller(makeCtx(null, db));
    const result = await caller.getPublicProfile({ id: "sp-1" });
    expect(result.languages).toEqual(["Spanish"]);
  });

  it("returns empty skills array when seeker has no skills", async () => {
    db.seekerProfile.findUnique.mockResolvedValue(makePublicSeekerProfile({ skills: [] }));
    const caller = createCaller(makeCtx(null, db));
    const result = await caller.getPublicProfile({ id: "sp-1" });
    expect(result.skills).toEqual([]);
  });

  it("returns empty languages array when seeker has no languages", async () => {
    db.seekerProfile.findUnique.mockResolvedValue(makePublicSeekerProfile({ languages: [] }));
    const caller = createCaller(makeCtx(null, db));
    const result = await caller.getPublicProfile({ id: "sp-1" });
    expect(result.languages).toEqual([]);
  });

  // ── isNew computation ──

  it("isNew is true when responseRate is null (never computed)", async () => {
    db.seekerProfile.findUnique.mockResolvedValue(makePublicSeekerProfile({ responseRate: null }));
    const caller = createCaller(makeCtx(null, db));
    const result = await caller.getPublicProfile({ id: "sp-1" });
    expect(result.isNew).toBe(true);
  });

  it("isNew is false when responseRate has been computed", async () => {
    db.seekerProfile.findUnique.mockResolvedValue(makePublicSeekerProfile({ responseRate: 0.8 }));
    const caller = createCaller(makeCtx(null, db));
    const result = await caller.getPublicProfile({ id: "sp-1" });
    expect(result.isNew).toBe(false);
  });

  // ── Privacy ──

  it("does not expose responseRate", async () => {
    db.seekerProfile.findUnique.mockResolvedValue(makePublicSeekerProfile({ responseRate: 0.9 }));
    const caller = createCaller(makeCtx(null, db));
    const result = await caller.getPublicProfile({ id: "sp-1" });
    expect(result).not.toHaveProperty("responseRate");
  });

  it("does not expose medianResponseHours", async () => {
    db.seekerProfile.findUnique.mockResolvedValue(
      makePublicSeekerProfile({ medianResponseHours: 24 }),
    );
    const caller = createCaller(makeCtx(null, db));
    const result = await caller.getPublicProfile({ id: "sp-1" });
    expect(result).not.toHaveProperty("medianResponseHours");
  });

  it("does not expose userId", async () => {
    db.seekerProfile.findUnique.mockResolvedValue(makePublicSeekerProfile());
    const caller = createCaller(makeCtx(null, db));
    const result = await caller.getPublicProfile({ id: "sp-1" });
    expect(result).not.toHaveProperty("userId");
  });

  // ── Access / status ──

  it("works without authentication (public procedure)", async () => {
    db.seekerProfile.findUnique.mockResolvedValue(makePublicSeekerProfile());
    const caller = createCaller(makeCtx(null, db));
    await expect(caller.getPublicProfile({ id: "sp-1" })).resolves.toBeDefined();
  });

  it("also works when called by an authenticated employer", async () => {
    db.seekerProfile.findUnique.mockResolvedValue(makePublicSeekerProfile());
    const caller = createCaller(makeCtx("EMPLOYER", db));
    await expect(caller.getPublicProfile({ id: "sp-1" })).resolves.toBeDefined();
  });

  it("returns PAUSED profile (UI is responsible for showing inactive state)", async () => {
    db.seekerProfile.findUnique.mockResolvedValue(makePublicSeekerProfile({ status: "PAUSED" }));
    const caller = createCaller(makeCtx(null, db));
    const result = await caller.getPublicProfile({ id: "sp-1" });
    expect(result.status).toBe("PAUSED");
  });

  // ── Not found ──

  it("throws NOT_FOUND for a non-existent profile id", async () => {
    db.seekerProfile.findUnique.mockResolvedValue(null);
    const caller = createCaller(makeCtx(null, db));
    await expect(caller.getPublicProfile({ id: "nonexistent" })).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });
});
