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
      findUnique: vi.fn(),
      update: vi.fn().mockResolvedValue({}),
    },
    employerProfile: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    application: {
      findMany: vi.fn(),
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

const createCaller = createCallerFactory(employerRouter);

const VALID_PROFILE_INPUT = {
  firstName: "Ada",
  lastName: "Lovelace",
  isAdult: true as const,
};

const STORED_PROFILE = {
  id: "profile-1",
  userId: "user-1",
  firstName: "Ada",
  lastName: "Lovelace",
  roleAtCompany: null,
  isResponsive: false,
  responsivenessUpdatedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

// ── employer.getProfile ───────────────────────────────────────────────────────

describe("employer.getProfile", () => {
  let db: ReturnType<typeof makeMockPrisma>;

  beforeEach(() => {
    db = makeMockPrisma();
  });

  it("returns the employer profile when it exists", async () => {
    db.employerProfile.findUnique.mockResolvedValue(STORED_PROFILE);
    const caller = createCaller(makeCtx("EMPLOYER", db));
    const result = await caller.getProfile();
    expect(result).toMatchObject({ id: "profile-1", firstName: "Ada" });
  });

  it("returns null when no profile exists yet", async () => {
    db.employerProfile.findUnique.mockResolvedValue(null);
    const caller = createCaller(makeCtx("EMPLOYER", db));
    const result = await caller.getProfile();
    expect(result).toBeNull();
  });

  it("queries by userId from session, not from input", async () => {
    db.employerProfile.findUnique.mockResolvedValue(STORED_PROFILE);
    const caller = createCaller(makeCtx("EMPLOYER", db, "user-42"));
    await caller.getProfile();
    expect(db.employerProfile.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: "user-42" } }),
    );
  });

  it("throws FORBIDDEN for a SEEKER", async () => {
    const caller = createCaller(makeCtx("SEEKER", db));
    await expect(caller.getProfile()).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("throws UNAUTHORIZED for unauthenticated callers", async () => {
    const caller = createCaller(makeCtx(null, db));
    await expect(caller.getProfile()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });
});

// ── employer.createProfile ────────────────────────────────────────────────────

describe("employer.createProfile", () => {
  let db: ReturnType<typeof makeMockPrisma>;

  beforeEach(() => {
    db = makeMockPrisma();
    db.employerProfile.findUnique.mockResolvedValue(null); // no existing profile
    db.user.findUnique.mockResolvedValue({ isAdult: false });
    db.employerProfile.create.mockResolvedValue(STORED_PROFILE);
  });

  // ── Happy path ──

  it("creates a profile and returns it", async () => {
    const caller = createCaller(makeCtx("EMPLOYER", db));
    const result = await caller.createProfile(VALID_PROFILE_INPUT);
    expect(result).toMatchObject({ id: "profile-1", firstName: "Ada" });
  });

  it("sets userId from session, not from input", async () => {
    const caller = createCaller(makeCtx("EMPLOYER", db, "user-42"));
    await caller.createProfile(VALID_PROFILE_INPUT);
    const data = db.employerProfile.create.mock.calls[0][0].data;
    expect(data.userId).toBe("user-42");
  });

  it("stores optional roleAtCompany when provided", async () => {
    const caller = createCaller(makeCtx("EMPLOYER", db));
    await caller.createProfile({ ...VALID_PROFILE_INPUT, roleAtCompany: "CEO" });
    const data = db.employerProfile.create.mock.calls[0][0].data;
    expect(data.roleAtCompany).toBe("CEO");
  });

  it("sets isAdult on user when not already an adult", async () => {
    db.user.findUnique.mockResolvedValue({ isAdult: false });
    const caller = createCaller(makeCtx("EMPLOYER", db));
    await caller.createProfile(VALID_PROFILE_INPUT);
    expect(db.user.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { isAdult: true } }),
    );
  });

  it("skips isAdult update when user is already an adult", async () => {
    db.user.findUnique.mockResolvedValue({ isAdult: true });
    const caller = createCaller(makeCtx("EMPLOYER", db));
    await caller.createProfile(VALID_PROFILE_INPUT);
    expect(db.user.update).not.toHaveBeenCalled();
  });

  // ── Boundary cases ──

  it("accepts firstName at exactly 100 chars", async () => {
    const caller = createCaller(makeCtx("EMPLOYER", db));
    await expect(
      caller.createProfile({ ...VALID_PROFILE_INPUT, firstName: "a".repeat(100) }),
    ).resolves.toBeDefined();
  });

  it("rejects firstName longer than 100 chars", async () => {
    const caller = createCaller(makeCtx("EMPLOYER", db));
    await expect(
      caller.createProfile({ ...VALID_PROFILE_INPUT, firstName: "a".repeat(101) }),
    ).rejects.toThrow(TRPCError);
  });

  it("accepts roleAtCompany at exactly 200 chars", async () => {
    const caller = createCaller(makeCtx("EMPLOYER", db));
    await expect(
      caller.createProfile({ ...VALID_PROFILE_INPUT, roleAtCompany: "a".repeat(200) }),
    ).resolves.toBeDefined();
  });

  it("rejects roleAtCompany longer than 200 chars", async () => {
    const caller = createCaller(makeCtx("EMPLOYER", db));
    await expect(
      caller.createProfile({ ...VALID_PROFILE_INPUT, roleAtCompany: "a".repeat(201) }),
    ).rejects.toThrow(TRPCError);
  });

  // ── Adversarial ──

  it("throws UNAUTHORIZED when session is null", async () => {
    const caller = createCaller(makeCtx(null, db));
    await expect(caller.createProfile(VALID_PROFILE_INPUT)).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
  });

  it("throws FORBIDDEN when called by a SEEKER", async () => {
    const caller = createCaller(makeCtx("SEEKER", db));
    await expect(caller.createProfile(VALID_PROFILE_INPUT)).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });

  it("throws FORBIDDEN when called by an ADMIN", async () => {
    const caller = createCaller(makeCtx("ADMIN", db));
    await expect(caller.createProfile(VALID_PROFILE_INPUT)).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });

  it("throws BAD_REQUEST when isAdult is missing and user is not yet adult", async () => {
    db.user.findUnique.mockResolvedValue({ isAdult: false });
    const caller = createCaller(makeCtx("EMPLOYER", db));
    const { isAdult: _isAdult, ...withoutAdult } = VALID_PROFILE_INPUT;
    await expect(caller.createProfile(withoutAdult)).rejects.toMatchObject({
      code: "BAD_REQUEST",
    });
  });

  it("throws BAD_REQUEST when profile already exists", async () => {
    db.employerProfile.findUnique.mockResolvedValue(STORED_PROFILE);
    const caller = createCaller(makeCtx("EMPLOYER", db));
    await expect(caller.createProfile(VALID_PROFILE_INPUT)).rejects.toMatchObject({
      code: "BAD_REQUEST",
    });
  });
});

// ── employer.updateProfile ────────────────────────────────────────────────────

describe("employer.updateProfile", () => {
  let db: ReturnType<typeof makeMockPrisma>;

  beforeEach(() => {
    db = makeMockPrisma();
    db.employerProfile.findUnique.mockResolvedValue({ id: "profile-1" });
    db.employerProfile.update.mockResolvedValue({ ...STORED_PROFILE, firstName: "Updated" });
  });

  it("updates the profile and returns it", async () => {
    const caller = createCaller(makeCtx("EMPLOYER", db));
    const result = await caller.updateProfile({ firstName: "Updated", lastName: "Lovelace" });
    expect(result).toMatchObject({ firstName: "Updated" });
  });

  it("updates via userId from session, not profile id in input", async () => {
    const caller = createCaller(makeCtx("EMPLOYER", db, "user-42"));
    await caller.updateProfile({ firstName: "X", lastName: "Y" });
    expect(db.employerProfile.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: "user-42" } }),
    );
  });

  it("throws NOT_FOUND when no profile exists", async () => {
    db.employerProfile.findUnique.mockResolvedValue(null);
    const caller = createCaller(makeCtx("EMPLOYER", db));
    await expect(caller.updateProfile({ firstName: "X", lastName: "Y" })).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });

  it("throws FORBIDDEN for a SEEKER", async () => {
    const caller = createCaller(makeCtx("SEEKER", db));
    await expect(caller.updateProfile({ firstName: "X", lastName: "Y" })).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });

  it("throws UNAUTHORIZED for unauthenticated callers", async () => {
    const caller = createCaller(makeCtx(null, db));
    await expect(caller.updateProfile({ firstName: "X", lastName: "Y" })).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
  });
});
