import { describe, it, expect, vi, beforeEach } from "vitest";

const { findFirst } = vi.hoisted(() => ({ findFirst: vi.fn() }));
vi.mock("@/db", () => ({ db: { query: { users: { findFirst } } } }));
vi.mock("@/auth", () => ({ auth: vi.fn() }));

import { auth } from "@/auth";
import { createTRPCContext } from "../trpc";

const mockAuth = vi.mocked(auth);

function session(userId: string) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return { user: { id: userId, role: "SEEKER" }, expires: "" } as any;
}

describe("createTRPCContext soft-delete guard", () => {
  beforeEach(() => vi.clearAllMocks());

  it("keeps the session for an active user", async () => {
    mockAuth.mockResolvedValue(session("u1"));
    findFirst.mockResolvedValue({ deletedAt: null });

    const ctx = await createTRPCContext({ headers: new Headers() });
    expect(ctx.session).not.toBeNull();
  });

  it("drops the session when the user has been soft-deleted", async () => {
    mockAuth.mockResolvedValue(session("u1"));
    findFirst.mockResolvedValue({ deletedAt: new Date() });

    const ctx = await createTRPCContext({ headers: new Headers() });
    expect(ctx.session).toBeNull();
  });

  it("drops the session when the user row is gone", async () => {
    mockAuth.mockResolvedValue(session("u1"));
    findFirst.mockResolvedValue(undefined);

    const ctx = await createTRPCContext({ headers: new Headers() });
    expect(ctx.session).toBeNull();
  });

  it("does not query the DB for an unauthenticated request", async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockAuth.mockResolvedValue(null as any);

    const ctx = await createTRPCContext({ headers: new Headers() });
    expect(ctx.session).toBeNull();
    expect(findFirst).not.toHaveBeenCalled();
  });
});
