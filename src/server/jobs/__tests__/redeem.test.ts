import { describe, it, expect, vi, beforeEach } from "vitest";
import { redeemToken } from "../redeem";

// ── Mock helpers ──────────────────────────────────────────────────────────────

function makeMockDb() {
  return {
    freshnessToken: {
      findUnique: vi.fn(),
      updateMany: vi.fn(),
    },
    seekerProfile: {
      update: vi.fn(),
    },
    jobPosting: {
      update: vi.fn(),
    },
    verificationPing: {
      update: vi.fn(),
    },
  };
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
  let mockDb: ReturnType<typeof makeMockDb>;

  beforeEach(() => {
    mockDb = makeMockDb();
    mockDb.seekerProfile.update.mockResolvedValue({});
    mockDb.jobPosting.update.mockResolvedValue({});
    mockDb.verificationPing.update.mockResolvedValue({});
    mockDb.freshnessToken.updateMany.mockResolvedValue({ count: 1 });
  });

  // ── Happy paths ──────────────────────────────────────────────────────────

  it("SEEKER_PROFILE + CONFIRMED → updates lastVerifiedAt, marks all ping tokens used", async () => {
    mockDb.freshnessToken.findUnique.mockResolvedValue(makeToken());

    const result = await redeemToken("valid-token-abc", mockDb as never);

    expect(result.status).toBe("success");
    expect(mockDb.seekerProfile.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "sp-1" },
        data: expect.objectContaining({ lastVerifiedAt: expect.any(Date) }),
      }),
    );
    expect(mockDb.verificationPing.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "ping-1" },
        data: expect.objectContaining({ response: "CONFIRMED", respondedAt: expect.any(Date) }),
      }),
    );
    expect(mockDb.freshnessToken.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { pingId: "ping-1" } }),
    );
  });

  it("SEEKER_PROFILE + PAUSED → sets status PAUSED", async () => {
    mockDb.freshnessToken.findUnique.mockResolvedValue(makeToken({ action: "PAUSED" }));

    const result = await redeemToken("valid-token-abc", mockDb as never);

    expect(result.status).toBe("success");
    expect(mockDb.seekerProfile.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "sp-1" },
        data: expect.objectContaining({ status: "PAUSED" }),
      }),
    );
  });

  it("SEEKER_PROFILE + NOT_LOOKING → sets status PAUSED", async () => {
    mockDb.freshnessToken.findUnique.mockResolvedValue(makeToken({ action: "NOT_LOOKING" }));

    const result = await redeemToken("valid-token-abc", mockDb as never);

    expect(result.status).toBe("success");
    expect(mockDb.seekerProfile.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "PAUSED" }),
      }),
    );
  });

  it("JOB_POSTING + CONFIRMED → updates job lastVerifiedAt", async () => {
    mockDb.freshnessToken.findUnique.mockResolvedValue(
      makeToken({ targetType: "JOB_POSTING", targetId: "job-1" }),
    );

    const result = await redeemToken("valid-token-abc", mockDb as never);

    expect(result.status).toBe("success");
    expect(mockDb.jobPosting.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "job-1" },
        data: expect.objectContaining({ lastVerifiedAt: expect.any(Date) }),
      }),
    );
  });

  it("JOB_POSTING + FILLED → sets job status FILLED", async () => {
    mockDb.freshnessToken.findUnique.mockResolvedValue(
      makeToken({ targetType: "JOB_POSTING", targetId: "job-1", action: "FILLED" }),
    );

    const result = await redeemToken("valid-token-abc", mockDb as never);

    expect(result.status).toBe("success");
    expect(mockDb.jobPosting.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "job-1" },
        data: expect.objectContaining({ status: "FILLED" }),
      }),
    );
  });

  it("JOB_POSTING + PAUSED → sets job status PAUSED", async () => {
    mockDb.freshnessToken.findUnique.mockResolvedValue(
      makeToken({ targetType: "JOB_POSTING", targetId: "job-1", action: "PAUSED" }),
    );

    const result = await redeemToken("valid-token-abc", mockDb as never);

    expect(result.status).toBe("success");
    expect(mockDb.jobPosting.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "PAUSED" }),
      }),
    );
  });

  // ── Invalid token cases ──────────────────────────────────────────────────

  it("nonexistent token → status: invalid", async () => {
    mockDb.freshnessToken.findUnique.mockResolvedValue(null);

    const result = await redeemToken("nonexistent", mockDb as never);

    expect(result.status).toBe("invalid");
    expect(mockDb.seekerProfile.update).not.toHaveBeenCalled();
    expect(mockDb.jobPosting.update).not.toHaveBeenCalled();
  });

  it("expired token → status: expired", async () => {
    mockDb.freshnessToken.findUnique.mockResolvedValue(
      makeToken({ expiresAt: new Date(Date.now() - 1000) }),
    );

    const result = await redeemToken("valid-token-abc", mockDb as never);

    expect(result.status).toBe("expired");
    expect(mockDb.seekerProfile.update).not.toHaveBeenCalled();
  });

  it("already-used token → status: already-used", async () => {
    mockDb.freshnessToken.findUnique.mockResolvedValue(
      makeToken({ usedAt: new Date(Date.now() - 60000) }),
    );

    const result = await redeemToken("valid-token-abc", mockDb as never);

    expect(result.status).toBe("already-used");
    expect(mockDb.seekerProfile.update).not.toHaveBeenCalled();
  });

  // ── Adversarial cases ──────────────────────────────────────────────────────

  it("SEEKER_PROFILE token with FILLED action → no-op on job table, still updates seeker", async () => {
    // FILLED is a job action but token says SEEKER_PROFILE — we don't update the job table
    mockDb.freshnessToken.findUnique.mockResolvedValue(makeToken({ action: "FILLED" }));

    const result = await redeemToken("valid-token-abc", mockDb as never);

    expect(result.status).toBe("success");
    expect(mockDb.jobPosting.update).not.toHaveBeenCalled();
    // SEEKER_PROFILE + FILLED → treated as PAUSED (same outcome as NOT_LOOKING)
    expect(mockDb.seekerProfile.update).toHaveBeenCalled();
  });

  it("JOB_POSTING token with NOT_LOOKING action → no-op on seeker table, job gets PAUSED", async () => {
    mockDb.freshnessToken.findUnique.mockResolvedValue(
      makeToken({ targetType: "JOB_POSTING", targetId: "job-1", action: "NOT_LOOKING" }),
    );

    const result = await redeemToken("valid-token-abc", mockDb as never);

    expect(result.status).toBe("success");
    expect(mockDb.seekerProfile.update).not.toHaveBeenCalled();
    expect(mockDb.jobPosting.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: "PAUSED" }) }),
    );
  });

  it("token without pingId still marks token used (no ping update)", async () => {
    mockDb.freshnessToken.findUnique.mockResolvedValue(makeToken({ pingId: null }));

    const result = await redeemToken("valid-token-abc", mockDb as never);

    expect(result.status).toBe("success");
    expect(mockDb.verificationPing.update).not.toHaveBeenCalled();
    expect(mockDb.freshnessToken.updateMany).not.toHaveBeenCalled();
  });
});
