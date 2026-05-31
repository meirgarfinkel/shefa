import { describe, it, expect, vi, beforeEach } from "vitest";
vi.mock("@/db", () => ({ db: {} }));
import { redeemToken } from "../redeem";
import {
  seekerProfile as seekerProfileSchema,
  jobPosting as jobPostingSchema,
  verificationPing as verificationPingSchema,
  freshnessToken as freshnessTokenSchema,
} from "@/db/schema";

// ── Mock helpers ──────────────────────────────────────────────────────────────

function makeMockDb() {
  const seekerSet = vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue([]) });
  const jobSet = vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue([]) });
  const pingSet = vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue([]) });
  const tokenSet = vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue([]) });

  const db = {
    query: {
      freshnessToken: { findFirst: vi.fn() },
    },
    update: vi.fn().mockImplementation((table: unknown) => {
      if (table === seekerProfileSchema) return { set: seekerSet };
      if (table === jobPostingSchema) return { set: jobSet };
      if (table === verificationPingSchema) return { set: pingSet };
      if (table === freshnessTokenSchema) return { set: tokenSet };
      return { set: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue([]) }) };
    }),
  };

  return { db, seekerSet, jobSet, pingSet, tokenSet };
}

const DAY_MS = 24 * 60 * 60 * 1000;

function makeToken(overrides: Record<string, unknown> = {}) {
  return {
    id: "ft-1",
    token: "valid-token-abc",
    targetType: "SEEKER_PROFILE",
    targetId: "sp-1",
    action: "CONFIRMED",
    pingId: "ping-1",
    expiresAt: new Date(Date.now() + 30 * DAY_MS),
    usedAt: null,
    createdAt: new Date(),
    ping: null,
    ...overrides,
  };
}

// ── redeemToken ───────────────────────────────────────────────────────────────

describe("redeemToken", () => {
  let mocks: ReturnType<typeof makeMockDb>;

  beforeEach(() => {
    mocks = makeMockDb();
  });

  // ── Happy paths ──────────────────────────────────────────────────────────

  it("SEEKER_PROFILE + CONFIRMED → updates lastVerifiedAt, marks all ping tokens used", async () => {
    mocks.db.query.freshnessToken.findFirst.mockResolvedValue(makeToken());
    const result = await redeemToken("valid-token-abc", mocks.db as never);

    expect(result.status).toBe("success");
    expect(mocks.seekerSet).toHaveBeenCalledWith(
      expect.objectContaining({ lastVerifiedAt: expect.any(Date) }),
    );
    expect(mocks.pingSet).toHaveBeenCalledWith(
      expect.objectContaining({ response: "CONFIRMED", respondedAt: expect.any(Date) }),
    );
    expect(mocks.tokenSet).toHaveBeenCalledWith(
      expect.objectContaining({ usedAt: expect.any(Date) }),
    );
  });

  it("SEEKER_PROFILE + PAUSED → sets status PAUSED", async () => {
    mocks.db.query.freshnessToken.findFirst.mockResolvedValue(makeToken({ action: "PAUSED" }));
    const result = await redeemToken("valid-token-abc", mocks.db as never);

    expect(result.status).toBe("success");
    expect(mocks.seekerSet).toHaveBeenCalledWith(expect.objectContaining({ status: "PAUSED" }));
  });

  it("SEEKER_PROFILE + NOT_LOOKING → sets status PAUSED", async () => {
    mocks.db.query.freshnessToken.findFirst.mockResolvedValue(makeToken({ action: "NOT_LOOKING" }));
    const result = await redeemToken("valid-token-abc", mocks.db as never);

    expect(result.status).toBe("success");
    expect(mocks.seekerSet).toHaveBeenCalledWith(expect.objectContaining({ status: "PAUSED" }));
  });

  it("JOB_POSTING + CONFIRMED → updates job lastVerifiedAt", async () => {
    mocks.db.query.freshnessToken.findFirst.mockResolvedValue(
      makeToken({ targetType: "JOB_POSTING", targetId: "job-1" }),
    );
    const result = await redeemToken("valid-token-abc", mocks.db as never);

    expect(result.status).toBe("success");
    expect(mocks.jobSet).toHaveBeenCalledWith(
      expect.objectContaining({ lastVerifiedAt: expect.any(Date) }),
    );
  });

  it("JOB_POSTING + FILLED → sets job status CLOSED with closureReason FILLED_ON_SHEFA", async () => {
    mocks.db.query.freshnessToken.findFirst.mockResolvedValue(
      makeToken({ targetType: "JOB_POSTING", targetId: "job-1", action: "FILLED" }),
    );
    const result = await redeemToken("valid-token-abc", mocks.db as never);

    expect(result.status).toBe("success");
    expect(mocks.jobSet).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "CLOSED",
        closureReason: "FILLED_ON_SHEFA",
        closedAt: expect.any(Date),
      }),
    );
  });

  it("JOB_POSTING + PAUSED → sets job status PAUSED", async () => {
    mocks.db.query.freshnessToken.findFirst.mockResolvedValue(
      makeToken({ targetType: "JOB_POSTING", targetId: "job-1", action: "PAUSED" }),
    );
    const result = await redeemToken("valid-token-abc", mocks.db as never);

    expect(result.status).toBe("success");
    expect(mocks.jobSet).toHaveBeenCalledWith(expect.objectContaining({ status: "PAUSED" }));
  });

  // ── Invalid token cases ──────────────────────────────────────────────────

  it("nonexistent token → status: invalid", async () => {
    mocks.db.query.freshnessToken.findFirst.mockResolvedValue(null);
    const result = await redeemToken("nonexistent", mocks.db as never);

    expect(result.status).toBe("invalid");
    expect(mocks.db.update).not.toHaveBeenCalledWith(seekerProfileSchema);
    expect(mocks.db.update).not.toHaveBeenCalledWith(jobPostingSchema);
  });

  it("expired token → status: expired", async () => {
    mocks.db.query.freshnessToken.findFirst.mockResolvedValue(
      makeToken({ expiresAt: new Date(Date.now() - 1000) }),
    );
    const result = await redeemToken("valid-token-abc", mocks.db as never);

    expect(result.status).toBe("expired");
    expect(mocks.db.update).not.toHaveBeenCalledWith(seekerProfileSchema);
  });

  it("already-used token → status: already-used", async () => {
    mocks.db.query.freshnessToken.findFirst.mockResolvedValue(
      makeToken({ usedAt: new Date(Date.now() - 60000) }),
    );
    const result = await redeemToken("valid-token-abc", mocks.db as never);

    expect(result.status).toBe("already-used");
    expect(mocks.db.update).not.toHaveBeenCalledWith(seekerProfileSchema);
  });

  // ── Adversarial cases ──────────────────────────────────────────────────────

  it("SEEKER_PROFILE token with FILLED action → no-op on job table, still updates seeker", async () => {
    // FILLED is a job action but token says SEEKER_PROFILE — job table should not be touched
    mocks.db.query.freshnessToken.findFirst.mockResolvedValue(makeToken({ action: "FILLED" }));
    const result = await redeemToken("valid-token-abc", mocks.db as never);

    expect(result.status).toBe("success");
    expect(mocks.db.update).not.toHaveBeenCalledWith(jobPostingSchema);
    expect(mocks.seekerSet).toHaveBeenCalled();
  });

  it("JOB_POSTING token with NOT_LOOKING action → no-op on seeker table, job gets PAUSED", async () => {
    mocks.db.query.freshnessToken.findFirst.mockResolvedValue(
      makeToken({ targetType: "JOB_POSTING", targetId: "job-1", action: "NOT_LOOKING" }),
    );
    const result = await redeemToken("valid-token-abc", mocks.db as never);

    expect(result.status).toBe("success");
    expect(mocks.db.update).not.toHaveBeenCalledWith(seekerProfileSchema);
    expect(mocks.jobSet).toHaveBeenCalledWith(expect.objectContaining({ status: "PAUSED" }));
  });

  it("token without pingId still marks token used (no ping update)", async () => {
    mocks.db.query.freshnessToken.findFirst.mockResolvedValue(makeToken({ pingId: null }));
    const result = await redeemToken("valid-token-abc", mocks.db as never);

    expect(result.status).toBe("success");
    expect(mocks.db.update).not.toHaveBeenCalledWith(verificationPingSchema);
    expect(mocks.db.update).not.toHaveBeenCalledWith(freshnessTokenSchema);
  });
});
