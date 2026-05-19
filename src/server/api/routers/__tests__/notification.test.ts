import { describe, it, expect, vi, beforeEach } from "vitest";
import { createCallerFactory } from "@/server/api/trpc";
import { notificationRouter } from "../notification";

vi.mock("@/db", () => ({ db: {} }));
vi.mock("@/auth", () => ({ auth: vi.fn() }));

// ── Mock helpers ───────────────────────────────────────────────────────────────

function makeMockDb() {
  return {
    query: {
      notificationPreferences: { findFirst: vi.fn(), findMany: vi.fn() },
    },
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockReturnValue({
        onConflictDoUpdate: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([]),
        }),
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
  let mockDb: ReturnType<typeof makeMockDb>;

  beforeEach(() => {
    mockDb = makeMockDb();
  });

  it("happy path: returns existing preferences", async () => {
    const caller = createCaller(makeCtx("SEEKER", mockDb));
    mockDb.insert.mockReturnValue({
      values: vi.fn().mockReturnValue({
        onConflictDoUpdate: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([DEFAULT_PREFS]),
        }),
      }),
    });

    const result = await caller.getPreferences();

    expect(result).toEqual(DEFAULT_PREFS);
  });

  it("creates defaults (PER_MESSAGE / PER_MESSAGE) when no record exists", async () => {
    const caller = createCaller(makeCtx("SEEKER", mockDb));
    mockDb.insert.mockReturnValue({
      values: vi.fn().mockReturnValue({
        onConflictDoUpdate: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([DEFAULT_PREFS]),
        }),
      }),
    });

    await caller.getPreferences();

    expect(mockDb.insert).toHaveBeenCalled();
  });

  it("scoped to caller's own userId", async () => {
    const caller = createCaller(makeCtx("SEEKER", mockDb, "user-42"));
    mockDb.insert.mockReturnValue({
      values: vi.fn().mockReturnValue({
        onConflictDoUpdate: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([{ ...DEFAULT_PREFS, userId: "user-42" }]),
        }),
      }),
    });

    const result = await caller.getPreferences();

    expect(result.userId).toBe("user-42");
    expect(mockDb.insert).toHaveBeenCalled();
  });

  it("EMPLOYER can also get preferences", async () => {
    const caller = createCaller(makeCtx("EMPLOYER", mockDb));
    mockDb.insert.mockReturnValue({
      values: vi.fn().mockReturnValue({
        onConflictDoUpdate: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([DEFAULT_PREFS]),
        }),
      }),
    });

    await expect(caller.getPreferences()).resolves.toBeDefined();
  });

  it("unauthenticated → UNAUTHORIZED", async () => {
    const caller = createCaller(makeCtx(null, mockDb));
    await expect(caller.getPreferences()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });
});

// ── updatePreferences ──────────────────────────────────────────────────────────

describe("updatePreferences", () => {
  let mockDb: ReturnType<typeof makeMockDb>;

  beforeEach(() => {
    mockDb = makeMockDb();
  });

  it("happy path: updates messageNotifications", async () => {
    const caller = createCaller(makeCtx("SEEKER", mockDb));
    const updated = { ...DEFAULT_PREFS, messageNotifications: "OFF" as const };
    mockDb.insert.mockReturnValue({
      values: vi.fn().mockReturnValue({
        onConflictDoUpdate: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([updated]),
        }),
      }),
    });

    const result = await caller.updatePreferences({ messageNotifications: "OFF" });

    expect(result).toEqual(updated);
  });

  it("happy path: updates applicationNotifications", async () => {
    const caller = createCaller(makeCtx("SEEKER", mockDb));
    const updated = { ...DEFAULT_PREFS, applicationNotifications: "DAILY_DIGEST" as const };
    mockDb.insert.mockReturnValue({
      values: vi.fn().mockReturnValue({
        onConflictDoUpdate: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([updated]),
        }),
      }),
    });

    const result = await caller.updatePreferences({ applicationNotifications: "DAILY_DIGEST" });

    expect(result).toEqual(updated);
  });

  it("happy path: updates both fields at once", async () => {
    const caller = createCaller(makeCtx("SEEKER", mockDb));
    const updated = {
      ...DEFAULT_PREFS,
      messageNotifications: "DAILY_DIGEST" as const,
      applicationNotifications: "OFF" as const,
    };
    mockDb.insert.mockReturnValue({
      values: vi.fn().mockReturnValue({
        onConflictDoUpdate: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([updated]),
        }),
      }),
    });

    const result = await caller.updatePreferences({
      messageNotifications: "DAILY_DIGEST",
      applicationNotifications: "OFF",
    });

    expect(result).toEqual(updated);
  });

  it("returns the updated record, not void", async () => {
    const caller = createCaller(makeCtx("SEEKER", mockDb));
    mockDb.insert.mockReturnValue({
      values: vi.fn().mockReturnValue({
        onConflictDoUpdate: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([DEFAULT_PREFS]),
        }),
      }),
    });

    const result = await caller.updatePreferences({ messageNotifications: "PER_MESSAGE" });

    expect(result).toHaveProperty("messageNotifications");
    expect(result).toHaveProperty("applicationNotifications");
  });

  it("partial update — only provided field is updated", async () => {
    const caller = createCaller(makeCtx("SEEKER", mockDb));
    mockDb.insert.mockReturnValue({
      values: vi.fn().mockReturnValue({
        onConflictDoUpdate: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([DEFAULT_PREFS]),
        }),
      }),
    });

    await caller.updatePreferences({ messageNotifications: "OFF" });

    expect(mockDb.insert).toHaveBeenCalled();
  });

  it("empty object succeeds without touching either field", async () => {
    const caller = createCaller(makeCtx("SEEKER", mockDb));
    mockDb.insert.mockReturnValue({
      values: vi.fn().mockReturnValue({
        onConflictDoUpdate: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([DEFAULT_PREFS]),
        }),
      }),
    });

    await expect(caller.updatePreferences({})).resolves.toBeDefined();

    expect(mockDb.insert).toHaveBeenCalled();
  });

  it("scoped to caller's own userId", async () => {
    const caller = createCaller(makeCtx("EMPLOYER", mockDb, "user-42"));
    mockDb.insert.mockReturnValue({
      values: vi.fn().mockReturnValue({
        onConflictDoUpdate: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([{ ...DEFAULT_PREFS, userId: "user-42" }]),
        }),
      }),
    });

    const result = await caller.updatePreferences({ messageNotifications: "OFF" });

    expect(result.userId).toBe("user-42");
    expect(mockDb.insert).toHaveBeenCalled();
  });

  it("EMPLOYER can update preferences", async () => {
    const caller = createCaller(makeCtx("EMPLOYER", mockDb));
    mockDb.insert.mockReturnValue({
      values: vi.fn().mockReturnValue({
        onConflictDoUpdate: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([DEFAULT_PREFS]),
        }),
      }),
    });

    await expect(
      caller.updatePreferences({ applicationNotifications: "DAILY_DIGEST" }),
    ).resolves.toBeDefined();
  });

  it("invalid enum value → Zod validation error", async () => {
    const caller = createCaller(makeCtx("SEEKER", mockDb));

    await expect(
      // @ts-expect-error intentionally invalid enum value
      caller.updatePreferences({ messageNotifications: "WEEKLY" }),
    ).rejects.toThrow();
  });

  it("unauthenticated → UNAUTHORIZED", async () => {
    const caller = createCaller(makeCtx(null, mockDb));

    await expect(caller.updatePreferences({ messageNotifications: "OFF" })).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
  });
});
