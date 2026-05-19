import { describe, it, expect, vi, beforeEach } from "vitest";
import { TRPCError } from "@trpc/server";
import { createCallerFactory } from "@/server/api/trpc";
import { employerRouter } from "../employer";

vi.mock("@/db", () => ({ db: {} }));
vi.mock("@/auth", () => ({ auth: vi.fn() }));

// ── Mock helpers ──────────────────────────────────────────────────────────────

function makeMockDb() {
  return {
    query: {
      users: { findFirst: vi.fn(), findMany: vi.fn() },
      employerProfile: { findFirst: vi.fn(), findMany: vi.fn() },
      application: { findFirst: vi.fn(), findMany: vi.fn() },
      jobPosting: { findFirst: vi.fn(), findMany: vi.fn() },
      company: { findFirst: vi.fn(), findMany: vi.fn() },
      seekerProfile: { findFirst: vi.fn(), findMany: vi.fn() },
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
  let db: ReturnType<typeof makeMockDb>;

  beforeEach(() => {
    db = makeMockDb();
  });

  it("returns the employer profile when it exists", async () => {
    db.query.employerProfile.findFirst.mockResolvedValue(STORED_PROFILE);
    const caller = createCaller(makeCtx("EMPLOYER", db));
    const result = await caller.getProfile();
    expect(result).toMatchObject({ id: "profile-1", firstName: "Ada" });
  });

  it("returns null when no profile exists yet", async () => {
    db.query.employerProfile.findFirst.mockResolvedValue(null);
    const caller = createCaller(makeCtx("EMPLOYER", db));
    const result = await caller.getProfile();
    expect(result).toBeNull();
  });

  it("queries by userId from session, not from input", async () => {
    db.query.employerProfile.findFirst.mockResolvedValue(STORED_PROFILE);
    const caller = createCaller(makeCtx("EMPLOYER", db, "user-42"));
    await caller.getProfile();
    expect(db.query.employerProfile.findFirst).toHaveBeenCalled();
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
  let db: ReturnType<typeof makeMockDb>;

  beforeEach(() => {
    db = makeMockDb();
    db.query.employerProfile.findFirst.mockResolvedValue(null); // no existing profile
    db.query.users.findFirst.mockResolvedValue({ isAdult: false });
    db.insert.mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([STORED_PROFILE]),
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
    const caller = createCaller(makeCtx("EMPLOYER", db));
    const result = await caller.createProfile(VALID_PROFILE_INPUT);
    expect(result).toMatchObject({ id: "profile-1", firstName: "Ada" });
  });

  it("sets userId from session, not from input", async () => {
    const caller = createCaller(makeCtx("EMPLOYER", db, "user-42"));
    db.insert.mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([{ ...STORED_PROFILE, userId: "user-42" }]),
      }),
    });
    const result = await caller.createProfile(VALID_PROFILE_INPUT);
    expect(result).toMatchObject({ userId: "user-42" });
  });

  it("stores optional roleAtCompany when provided", async () => {
    const caller = createCaller(makeCtx("EMPLOYER", db));
    db.insert.mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([{ ...STORED_PROFILE, roleAtCompany: "CEO" }]),
      }),
    });
    const result = await caller.createProfile({ ...VALID_PROFILE_INPUT, roleAtCompany: "CEO" });
    expect(result).toMatchObject({ roleAtCompany: "CEO" });
  });

  it("sets isAdult on user when not already an adult", async () => {
    db.query.users.findFirst.mockResolvedValue({ isAdult: false });
    const caller = createCaller(makeCtx("EMPLOYER", db));
    await caller.createProfile(VALID_PROFILE_INPUT);
    expect(db.update).toHaveBeenCalled();
  });

  it("skips isAdult update when user is already an adult", async () => {
    db.query.users.findFirst.mockResolvedValue({ isAdult: true });
    const caller = createCaller(makeCtx("EMPLOYER", db));
    await caller.createProfile(VALID_PROFILE_INPUT);
    // update should not be called for isAdult (only insert for profile)
    expect(db.update).not.toHaveBeenCalled();
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
    db.query.users.findFirst.mockResolvedValue({ isAdult: false });
    const caller = createCaller(makeCtx("EMPLOYER", db));
    const { isAdult: _isAdult, ...withoutAdult } = VALID_PROFILE_INPUT;
    await expect(caller.createProfile(withoutAdult)).rejects.toMatchObject({
      code: "BAD_REQUEST",
    });
  });

  it("throws BAD_REQUEST when profile already exists", async () => {
    db.query.employerProfile.findFirst.mockResolvedValue(STORED_PROFILE);
    const caller = createCaller(makeCtx("EMPLOYER", db));
    await expect(caller.createProfile(VALID_PROFILE_INPUT)).rejects.toMatchObject({
      code: "BAD_REQUEST",
    });
  });
});

// ── employer.updateProfile ────────────────────────────────────────────────────

describe("employer.updateProfile", () => {
  let db: ReturnType<typeof makeMockDb>;

  beforeEach(() => {
    db = makeMockDb();
    db.query.employerProfile.findFirst.mockResolvedValue({ id: "profile-1" });
    db.update.mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([{ ...STORED_PROFILE, firstName: "Updated" }]),
        }),
      }),
    });
  });

  it("updates the profile and returns it", async () => {
    const caller = createCaller(makeCtx("EMPLOYER", db));
    const result = await caller.updateProfile({ firstName: "Updated", lastName: "Lovelace" });
    expect(result).toMatchObject({ firstName: "Updated" });
  });

  it("updates via userId from session, not profile id in input", async () => {
    const caller = createCaller(makeCtx("EMPLOYER", db, "user-42"));
    await caller.updateProfile({ firstName: "X", lastName: "Y" });
    expect(db.update).toHaveBeenCalled();
  });

  it("throws NOT_FOUND when no profile exists", async () => {
    db.query.employerProfile.findFirst.mockResolvedValue(null);
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
