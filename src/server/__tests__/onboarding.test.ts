import { describe, it, expect, vi, beforeEach } from "vitest";
import { redirectSeekerWithoutProfile } from "../onboarding";

vi.mock("@/auth", () => ({ auth: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));
vi.mock("@/db", () => ({
  db: { query: { seekerProfile: { findFirst: vi.fn() } } },
}));

import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { db } from "@/db";

const mockAuth = vi.mocked(auth);
const mockRedirect = vi.mocked(redirect);
const mockFindFirst = vi.mocked(db.query.seekerProfile.findFirst);

describe("redirectSeekerWithoutProfile", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("is a no-op for an unauthenticated visitor", async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockAuth.mockResolvedValue(null as any);
    await redirectSeekerWithoutProfile();
    expect(mockFindFirst).not.toHaveBeenCalled();
    expect(mockRedirect).not.toHaveBeenCalled();
  });

  it("is a no-op for an EMPLOYER", async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockAuth.mockResolvedValue({ user: { id: "u1", role: "EMPLOYER" } } as any);
    await redirectSeekerWithoutProfile();
    expect(mockFindFirst).not.toHaveBeenCalled();
    expect(mockRedirect).not.toHaveBeenCalled();
  });

  it("is a no-op for an ADMIN", async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockAuth.mockResolvedValue({ user: { id: "u1", role: "ADMIN" } } as any);
    await redirectSeekerWithoutProfile();
    expect(mockFindFirst).not.toHaveBeenCalled();
    expect(mockRedirect).not.toHaveBeenCalled();
  });

  it("does not redirect a SEEKER who already has a profile", async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockAuth.mockResolvedValue({ user: { id: "u1", role: "SEEKER" } } as any);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockFindFirst.mockResolvedValue({ id: "sp-1" } as any);
    await redirectSeekerWithoutProfile();
    expect(mockFindFirst).toHaveBeenCalledTimes(1);
    expect(mockRedirect).not.toHaveBeenCalled();
  });

  it("redirects a SEEKER with no profile to profile creation", async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockAuth.mockResolvedValue({ user: { id: "u1", role: "SEEKER" } } as any);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockFindFirst.mockResolvedValue(undefined as any);
    await redirectSeekerWithoutProfile();
    expect(mockRedirect).toHaveBeenCalledWith("/seeker/profile/new");
  });
});
