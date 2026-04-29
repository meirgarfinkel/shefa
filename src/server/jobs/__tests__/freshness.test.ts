import { describe, it, expect } from "vitest";
import { computeFreshnessAction } from "../freshness.job";

// ── Helpers ───────────────────────────────────────────────────────────────────

const DAY_MS = 24 * 60 * 60 * 1000;
const NOW = new Date("2024-06-28T12:00:00Z");

function daysAgo(n: number): Date {
  return new Date(NOW.getTime() - n * DAY_MS);
}

function unrespondedPing() {
  return { respondedAt: null };
}

function respondedPing() {
  return { respondedAt: new Date() };
}

// ── computeFreshnessAction ────────────────────────────────────────────────────

describe("computeFreshnessAction", () => {
  // ── Happy paths ────────────────────────────────────────────────────────────

  it("no-action: lastVerifiedAt 13 days ago, 0 pings", () => {
    expect(computeFreshnessAction(daysAgo(13), [], NOW)).toBe("no-action");
  });

  it("send-initial-ping: lastVerifiedAt 14 days ago, 0 pings", () => {
    expect(computeFreshnessAction(daysAgo(14), [], NOW)).toBe("send-initial-ping");
  });

  it("send-initial-ping: lastVerifiedAt 15 days ago, 0 pings", () => {
    expect(computeFreshnessAction(daysAgo(15), [], NOW)).toBe("send-initial-ping");
  });

  it("no-action: lastVerifiedAt 15 days ago, 1 unanswered ping (waiting period)", () => {
    expect(computeFreshnessAction(daysAgo(15), [unrespondedPing()], NOW)).toBe("no-action");
  });

  it("send-warning-ping: lastVerifiedAt 20 days ago, 1 unanswered ping", () => {
    expect(computeFreshnessAction(daysAgo(20), [unrespondedPing()], NOW)).toBe("send-warning-ping");
  });

  it("auto-pause: lastVerifiedAt 28 days ago, 1 unanswered ping", () => {
    expect(computeFreshnessAction(daysAgo(28), [unrespondedPing()], NOW)).toBe("auto-pause");
  });

  it("auto-pause: lastVerifiedAt 28 days ago, 2 unanswered pings", () => {
    expect(computeFreshnessAction(daysAgo(28), [unrespondedPing(), unrespondedPing()], NOW)).toBe(
      "auto-pause",
    );
  });

  it("no-action: 14 days ago, ping has response", () => {
    expect(computeFreshnessAction(daysAgo(14), [respondedPing()], NOW)).toBe("no-action");
  });

  it("no-action: 28 days ago, ping has response", () => {
    expect(computeFreshnessAction(daysAgo(28), [respondedPing()], NOW)).toBe("no-action");
  });

  // ── Boundary conditions ────────────────────────────────────────────────────

  it("boundary: exactly 14.0 days → send-initial-ping", () => {
    expect(computeFreshnessAction(new Date(NOW.getTime() - 14 * DAY_MS), [], NOW)).toBe(
      "send-initial-ping",
    );
  });

  it("boundary: 13 days 23h 59m 59s → no-action", () => {
    const lastVerifiedAt = new Date(NOW.getTime() - (14 * DAY_MS - 1000));
    expect(computeFreshnessAction(lastVerifiedAt, [], NOW)).toBe("no-action");
  });

  it("boundary: exactly 20.0 days, 1 unanswered ping → send-warning-ping", () => {
    expect(
      computeFreshnessAction(new Date(NOW.getTime() - 20 * DAY_MS), [unrespondedPing()], NOW),
    ).toBe("send-warning-ping");
  });

  it("boundary: 19 days 23h 59m, 1 unanswered ping → no-action (< 20 days)", () => {
    const lastVerifiedAt = new Date(NOW.getTime() - (20 * DAY_MS - 60000));
    expect(computeFreshnessAction(lastVerifiedAt, [unrespondedPing()], NOW)).toBe("no-action");
  });

  it("boundary: exactly 28.0 days, 1 unanswered ping → auto-pause", () => {
    expect(
      computeFreshnessAction(new Date(NOW.getTime() - 28 * DAY_MS), [unrespondedPing()], NOW),
    ).toBe("auto-pause");
  });

  it("boundary: 27 days 23h 59m, 1 unanswered ping → send-warning-ping (day 20+ with no warning yet)", () => {
    const lastVerifiedAt = new Date(NOW.getTime() - (28 * DAY_MS - 60000));
    expect(computeFreshnessAction(lastVerifiedAt, [unrespondedPing()], NOW)).toBe(
      "send-warning-ping",
    );
  });

  // ── Adversarial cases ──────────────────────────────────────────────────────

  it("adversarial: lastVerifiedAt in the future → no-action", () => {
    const futureDate = new Date(NOW.getTime() + DAY_MS);
    expect(computeFreshnessAction(futureDate, [], NOW)).toBe("no-action");
  });

  it("adversarial: 35 days, 0 pings (job failure) → send-initial-ping, not auto-pause", () => {
    // Worker failed for 35 days. Without a ping, the user was never warned — don't auto-pause.
    expect(computeFreshnessAction(daysAgo(35), [], NOW)).toBe("send-initial-ping");
  });

  it("adversarial: 2 unanswered pings at 27 days → no-action (not yet day 28)", () => {
    expect(computeFreshnessAction(daysAgo(27), [unrespondedPing(), unrespondedPing()], NOW)).toBe(
      "no-action",
    );
  });

  it("adversarial: responded ping + unanswered ping → no-action (response takes priority)", () => {
    expect(computeFreshnessAction(daysAgo(28), [respondedPing(), unrespondedPing()], NOW)).toBe(
      "no-action",
    );
  });

  it("adversarial: 30 days, 1 unanswered ping → auto-pause", () => {
    expect(computeFreshnessAction(daysAgo(30), [unrespondedPing()], NOW)).toBe("auto-pause");
  });
});
