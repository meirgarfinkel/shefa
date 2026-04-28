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
      caller.createProfile({ ...VALID_INPUT, aboutCompany: "a".repeat(2000) })
    ).resolves.toBeDefined();
  });

  it("rejects aboutCompany longer than 2000 chars", async () => {
    const caller = createCaller(makeCtx("EMPLOYER", db));
    await expect(
      caller.createProfile({ ...VALID_INPUT, aboutCompany: "a".repeat(2001) })
    ).rejects.toThrow(TRPCError);
  });

  it("accepts missionText at exactly 1000 chars", async () => {
    const caller = createCaller(makeCtx("EMPLOYER", db));
    await expect(
      caller.createProfile({ ...VALID_INPUT, missionText: "a".repeat(1000) })
    ).resolves.toBeDefined();
  });

  it("rejects missionText longer than 1000 chars", async () => {
    const caller = createCaller(makeCtx("EMPLOYER", db));
    await expect(
      caller.createProfile({ ...VALID_INPUT, missionText: "a".repeat(1001) })
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
