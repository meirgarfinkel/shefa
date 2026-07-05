import { describe, it, expect } from "vitest";
import { buildJobInitialPingEmail, buildJobWarningEmail } from "../freshness-ping";

const URLS = {
  confirm: "https://shefa.test/api/verify/confirm-tok",
  pause: "https://shefa.test/api/verify/pause-tok",
  filled: "https://shefa.test/api/verify/filled-tok",
};

// Fixed pause horizon so the formatted date is deterministic (rendered in UTC).
const PAUSE_DATE = new Date("2026-08-02T00:00:00Z");

describe("buildJobInitialPingEmail", () => {
  it("includes the freshness-check action links", () => {
    const { html } = buildJobInitialPingEmail("owner@biz.test", "Line Cook", URLS, PAUSE_DATE);
    expect(html).toContain(URLS.confirm);
    expect(html).toContain(URLS.pause);
    expect(html).toContain(URLS.filled);
  });

  it("warns that the listing auto-pauses by the pause date", () => {
    const { html } = buildJobInitialPingEmail("owner@biz.test", "Line Cook", URLS, PAUSE_DATE);
    expect(html).toContain("August 2, 2026");
    expect(html).toMatch(/paused\s+automatically/i);
  });
});

describe("buildJobWarningEmail", () => {
  it("warns that the listing auto-pauses by the pause date", () => {
    const { html } = buildJobWarningEmail("owner@biz.test", "Line Cook", URLS, PAUSE_DATE);
    expect(html).toContain("August 2, 2026");
    expect(html).toMatch(/paused\s+automatically/i);
  });
});
