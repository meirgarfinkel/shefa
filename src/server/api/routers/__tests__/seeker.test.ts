import { describe, it, expect, vi, beforeEach } from "vitest";
import { TRPCError } from "@trpc/server";
import { createCallerFactory } from "@/server/api/trpc";
import { seekerRouter } from "../seeker";

vi.mock("@/db", () => ({ db: {} }));
vi.mock("@/auth", () => ({ auth: vi.fn() }));

// ── Mock helpers ──────────────────────────────────────────────────────────────

function makeMockDb() {
  return {
    query: {
      seekerProfile: { findFirst: vi.fn(), findMany: vi.fn() },
      users: { findFirst: vi.fn(), findMany: vi.fn() },
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
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([]),
      }),
    }),
    execute: vi.fn().mockResolvedValue([]),
  };
}

function makePublicSeekerProfile(overrides: Record<string, unknown> = {}) {
  return {
    id: "sp-1",
    firstName: "Jane",
    lastName: "Doe",
    city: "Brooklyn",
    state: "NY",
    workAuthorization: true,
    availableDays: ["MON", "TUE"],
    jobSeekText: "I want to learn to cook.",
    educationLevel: null,
    about: null,
    userId: "user-secret",
    status: "ACTIVE",
    createdAt: new Date("2026-01-01"),
    updatedAt: new Date("2026-01-01"),
    languages: [{ language: { name: "Spanish" } }],
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

const createCaller = createCallerFactory(seekerRouter);

const VALID_INPUT = {
  firstName: "Jane",
  lastName: "Doe",
  country: "US" as const,
  city: "Brooklyn",
  state: "NY",
  workAuthorization: true,
  isAdult: true as const,
  availableDays: ["MON", "TUE", "WED"] as Array<
    "SUN" | "MON" | "TUE" | "WED" | "THU" | "FRI" | "SAT"
  >,
  jobSeekText: "I want to learn to cook and work in a restaurant.",
};

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("seeker.createProfile", () => {
  let db: ReturnType<typeof makeMockDb>;

  beforeEach(() => {
    db = makeMockDb();
    db.query.seekerProfile.findFirst.mockResolvedValue(null);
    db.insert.mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([{ id: "profile-1", userId: "user-1" }]),
      }),
    });
    // update for isAdult
    db.update.mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      }),
    });
  });

  // ── Happy path ──

  it("creates a profile and returns it", async () => {
    const caller = createCaller(makeCtx("SEEKER", db));
    const result = await caller.createProfile(VALID_INPUT);
    expect(result).toMatchObject({ id: "profile-1" });
  });

  it("always sets userId from session, not from input", async () => {
    const caller = createCaller(makeCtx("SEEKER", db, "user-1"));
    db.insert.mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([{ id: "profile-1", userId: "user-1" }]),
      }),
    });
    const result = await caller.createProfile(VALID_INPUT);
    expect(result.userId).toBe("user-1");
  });

  it("stores optional fields when provided", async () => {
    const caller = createCaller(makeCtx("SEEKER", db));
    db.insert.mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi
          .fn()
          .mockResolvedValue([
            { id: "profile-1", userId: "user-1", about: "Hello", educationLevel: "HIGH_SCHOOL" },
          ]),
      }),
    });
    const result = await caller.createProfile({
      ...VALID_INPUT,
      about: "Hello",
      educationLevel: "HIGH_SCHOOL",
    });
    expect(result.about).toBe("Hello");
    expect(result.educationLevel).toBe("HIGH_SCHOOL");
  });

  it("omits optional fields when not provided", async () => {
    const caller = createCaller(makeCtx("SEEKER", db));
    const result = await caller.createProfile(VALID_INPUT);
    expect(result).not.toHaveProperty("about", "Hello");
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
    db.insert.mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi
          .fn()
          .mockResolvedValue([
            { id: "profile-1", userId: "user-1", availableDays: ["MON", "TUE"] },
          ]),
      }),
    });
    const result = await caller.createProfile({
      ...VALID_INPUT,
      availableDays: ["MON", "MON", "TUE"] as Array<
        "SUN" | "MON" | "TUE" | "WED" | "THU" | "FRI" | "SAT"
      >,
    });
    expect(result.availableDays).toEqual(["MON", "TUE"]);
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
    db.query.seekerProfile.findFirst.mockResolvedValue({ id: "existing" });
    const caller = createCaller(makeCtx("SEEKER", db));
    await expect(caller.createProfile(VALID_INPUT)).rejects.toMatchObject({
      code: "CONFLICT",
    });
  });
});

// ── seeker.getPublicProfile ───────────────────────────────────────────────────

describe("seeker.getPublicProfile", () => {
  let db: ReturnType<typeof makeMockDb>;

  beforeEach(() => {
    db = makeMockDb();
  });

  // ── Happy path ──

  it("returns public profile for an active seeker", async () => {
    db.query.seekerProfile.findFirst.mockResolvedValue(makePublicSeekerProfile());
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

  it("returns languages as a flat array of names", async () => {
    db.query.seekerProfile.findFirst.mockResolvedValue(makePublicSeekerProfile());
    const caller = createCaller(makeCtx(null, db));
    const result = await caller.getPublicProfile({ id: "sp-1" });
    expect(result.languages).toEqual(["Spanish"]);
  });

  it("returns empty languages array when seeker has no languages", async () => {
    db.query.seekerProfile.findFirst.mockResolvedValue(makePublicSeekerProfile({ languages: [] }));
    const caller = createCaller(makeCtx(null, db));
    const result = await caller.getPublicProfile({ id: "sp-1" });
    expect(result.languages).toEqual([]);
  });

  // ── Privacy ──

  it("does not expose userId", async () => {
    db.query.seekerProfile.findFirst.mockResolvedValue(makePublicSeekerProfile());
    const caller = createCaller(makeCtx(null, db));
    const result = await caller.getPublicProfile({ id: "sp-1" });
    expect(result).not.toHaveProperty("userId");
  });

  // ── Access / status ──

  it("works without authentication (public procedure)", async () => {
    db.query.seekerProfile.findFirst.mockResolvedValue(makePublicSeekerProfile());
    const caller = createCaller(makeCtx(null, db));
    await expect(caller.getPublicProfile({ id: "sp-1" })).resolves.toBeDefined();
  });

  it("also works when called by an authenticated employer", async () => {
    db.query.seekerProfile.findFirst.mockResolvedValue(makePublicSeekerProfile());
    const caller = createCaller(makeCtx("EMPLOYER", db));
    await expect(caller.getPublicProfile({ id: "sp-1" })).resolves.toBeDefined();
  });

  it("returns PAUSED profile (UI is responsible for showing inactive state)", async () => {
    db.query.seekerProfile.findFirst.mockResolvedValue(
      makePublicSeekerProfile({ status: "PAUSED" }),
    );
    const caller = createCaller(makeCtx(null, db));
    const result = await caller.getPublicProfile({ id: "sp-1" });
    expect(result.status).toBe("PAUSED");
  });

  // ── Not found ──

  it("throws NOT_FOUND for a non-existent profile id", async () => {
    db.query.seekerProfile.findFirst.mockResolvedValue(null);
    const caller = createCaller(makeCtx(null, db));
    await expect(caller.getPublicProfile({ id: "nonexistent" })).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });
});
