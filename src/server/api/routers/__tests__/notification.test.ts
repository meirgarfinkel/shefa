import { describe, it, expect, vi, beforeEach } from "vitest";
import { createCallerFactory } from "@/server/api/trpc";
import { notificationRouter } from "../notification";

vi.mock("@/lib/prisma", () => ({ prisma: {} }));
vi.mock("@/auth", () => ({ auth: vi.fn() }));

// ── Mock helpers ───────────────────────────────────────────────────────────────

function makeMockPrisma() {
  return {
    notificationPreferences: {
      upsert: vi.fn(),
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

const createCaller = createCallerFactory(notificationRouter);

// ── Fixtures ───────────────────────────────────────────────────────────────────

const DEFAULT_PREFS = {
  id: "prefs-1",
  userId: "user-1",
  messageNotifications: "PER_MESSAGE" as const,
  applicationNotifications: "PER_MESSAGE" as const,
  createdAt: new Date(),
  updatedAt: new Date(),
};

// ── getPreferences ─────────────────────────────────────────────────────────────

describe("getPreferences", () => {
  let mockPrisma: ReturnType<typeof makeMockPrisma>;

  beforeEach(() => {
    mockPrisma = makeMockPrisma();
  });

  it("happy path: returns existing preferences", async () => {
    const caller = createCaller(makeCtx("SEEKER", mockPrisma));
    mockPrisma.notificationPreferences.upsert.mockResolvedValue(DEFAULT_PREFS);

    const result = await caller.getPreferences();

    expect(result).toEqual(DEFAULT_PREFS);
  });

  it("creates defaults (PER_MESSAGE / PER_MESSAGE) when no record exists", async () => {
    const caller = createCaller(makeCtx("SEEKER", mockPrisma));
    mockPrisma.notificationPreferences.upsert.mockResolvedValue(DEFAULT_PREFS);

    await caller.getPreferences();

    expect(mockPrisma.notificationPreferences.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          messageNotifications: "PER_MESSAGE",
          applicationNotifications: "PER_MESSAGE",
        }),
      }),
    );
  });

  it("scoped to caller's own userId", async () => {
    const caller = createCaller(makeCtx("SEEKER", mockPrisma, "user-42"));
    mockPrisma.notificationPreferences.upsert.mockResolvedValue({
      ...DEFAULT_PREFS,
      userId: "user-42",
    });

    await caller.getPreferences();

    expect(mockPrisma.notificationPreferences.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: "user-42" } }),
    );
  });

  it("EMPLOYER can also get preferences", async () => {
    const caller = createCaller(makeCtx("EMPLOYER", mockPrisma));
    mockPrisma.notificationPreferences.upsert.mockResolvedValue(DEFAULT_PREFS);

    await expect(caller.getPreferences()).resolves.toBeDefined();
  });

  it("unauthenticated → UNAUTHORIZED", async () => {
    const caller = createCaller(makeCtx(null, mockPrisma));
    await expect(caller.getPreferences()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });
});

// ── updatePreferences ──────────────────────────────────────────────────────────

describe("updatePreferences", () => {
  let mockPrisma: ReturnType<typeof makeMockPrisma>;

  beforeEach(() => {
    mockPrisma = makeMockPrisma();
  });

  it("happy path: updates messageNotifications", async () => {
    const caller = createCaller(makeCtx("SEEKER", mockPrisma));
    const updated = { ...DEFAULT_PREFS, messageNotifications: "OFF" as const };
    mockPrisma.notificationPreferences.upsert.mockResolvedValue(updated);

    const result = await caller.updatePreferences({ messageNotifications: "OFF" });

    expect(result).toEqual(updated);
  });

  it("happy path: updates applicationNotifications", async () => {
    const caller = createCaller(makeCtx("SEEKER", mockPrisma));
    const updated = { ...DEFAULT_PREFS, applicationNotifications: "DAILY_DIGEST" as const };
    mockPrisma.notificationPreferences.upsert.mockResolvedValue(updated);

    const result = await caller.updatePreferences({ applicationNotifications: "DAILY_DIGEST" });

    expect(result).toEqual(updated);
  });

  it("happy path: updates both fields at once", async () => {
    const caller = createCaller(makeCtx("SEEKER", mockPrisma));
    const updated = {
      ...DEFAULT_PREFS,
      messageNotifications: "DAILY_DIGEST" as const,
      applicationNotifications: "OFF" as const,
    };
    mockPrisma.notificationPreferences.upsert.mockResolvedValue(updated);

    const result = await caller.updatePreferences({
      messageNotifications: "DAILY_DIGEST",
      applicationNotifications: "OFF",
    });

    expect(result).toEqual(updated);
  });

  it("returns the updated record, not void", async () => {
    const caller = createCaller(makeCtx("SEEKER", mockPrisma));
    mockPrisma.notificationPreferences.upsert.mockResolvedValue(DEFAULT_PREFS);

    const result = await caller.updatePreferences({ messageNotifications: "PER_MESSAGE" });

    expect(result).toHaveProperty("messageNotifications");
    expect(result).toHaveProperty("applicationNotifications");
  });

  it("partial update does not include the unset field in the DB update payload", async () => {
    const caller = createCaller(makeCtx("SEEKER", mockPrisma));
    mockPrisma.notificationPreferences.upsert.mockResolvedValue(DEFAULT_PREFS);

    await caller.updatePreferences({ messageNotifications: "OFF" });

    expect(mockPrisma.notificationPreferences.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: expect.not.objectContaining({
          applicationNotifications: expect.anything(),
        }),
      }),
    );
  });

  it("empty object succeeds without touching either field", async () => {
    const caller = createCaller(makeCtx("SEEKER", mockPrisma));
    mockPrisma.notificationPreferences.upsert.mockResolvedValue(DEFAULT_PREFS);

    await expect(caller.updatePreferences({})).resolves.toBeDefined();

    expect(mockPrisma.notificationPreferences.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ update: {} }),
    );
  });

  it("scoped to caller's own userId", async () => {
    const caller = createCaller(makeCtx("EMPLOYER", mockPrisma, "user-42"));
    mockPrisma.notificationPreferences.upsert.mockResolvedValue({
      ...DEFAULT_PREFS,
      userId: "user-42",
    });

    await caller.updatePreferences({ messageNotifications: "OFF" });

    expect(mockPrisma.notificationPreferences.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: "user-42" } }),
    );
  });

  it("EMPLOYER can update preferences", async () => {
    const caller = createCaller(makeCtx("EMPLOYER", mockPrisma));
    mockPrisma.notificationPreferences.upsert.mockResolvedValue(DEFAULT_PREFS);

    await expect(
      caller.updatePreferences({ applicationNotifications: "DAILY_DIGEST" }),
    ).resolves.toBeDefined();
  });

  it("invalid enum value → Zod validation error", async () => {
    const caller = createCaller(makeCtx("SEEKER", mockPrisma));

    await expect(
      // @ts-expect-error intentionally invalid enum value
      caller.updatePreferences({ messageNotifications: "WEEKLY" }),
    ).rejects.toThrow();
  });

  it("unauthenticated → UNAUTHORIZED", async () => {
    const caller = createCaller(makeCtx(null, mockPrisma));

    await expect(caller.updatePreferences({ messageNotifications: "OFF" })).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
  });
});
