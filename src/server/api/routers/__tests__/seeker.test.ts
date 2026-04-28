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

type Role = "SEEKER" | "EMPLOYER" | "ADMIN";

function makeCtx(
  role: Role | null,
  prisma: ReturnType<typeof makeMockPrisma>,
  userId = "user-1"
) {
  return {
    headers: new Headers(),
    session:
      role !== null
        ? {
            user: { id: userId, email: "test@example.com", name: null, image: null, role },
            expires: new Date(Date.now() + 86400000).toISOString(),
          }
        : null,
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
  availableDays: ["MON", "TUE", "WED"] as const,
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
      caller.createProfile({ ...VALID_INPUT, jobSeekText: "a".repeat(1000) })
    ).resolves.toBeDefined();
  });

  it("rejects jobSeekText longer than 1000 chars", async () => {
    const caller = createCaller(makeCtx("SEEKER", db));
    await expect(
      caller.createProfile({ ...VALID_INPUT, jobSeekText: "a".repeat(1001) })
    ).rejects.toThrow(TRPCError);
  });

  it("accepts an empty availableDays array", async () => {
    const caller = createCaller(makeCtx("SEEKER", db));
    await expect(
      caller.createProfile({ ...VALID_INPUT, availableDays: [] })
    ).resolves.toBeDefined();
  });

  it("deduplicates repeated availableDays values", async () => {
    const caller = createCaller(makeCtx("SEEKER", db));
    await caller.createProfile({ ...VALID_INPUT, availableDays: ["MON", "MON", "TUE"] as any });
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
