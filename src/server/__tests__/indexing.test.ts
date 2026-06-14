import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { jobIndexUrl, notifyGoogleIndex } from "../indexing";

describe("jobIndexUrl", () => {
  const prev = process.env.AUTH_URL;
  afterEach(() => {
    process.env.AUTH_URL = prev;
  });
  it("builds the absolute public job URL from AUTH_URL", () => {
    process.env.AUTH_URL = "https://shefa.example.com";
    expect(jobIndexUrl("abc")).toBe("https://shefa.example.com/jobs/abc");
  });
});

describe("notifyGoogleIndex", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    delete process.env.GOOGLE_INDEXING_CLIENT_EMAIL;
    delete process.env.GOOGLE_INDEXING_PRIVATE_KEY;
  });

  it("is a no-op (no fetch) when service-account creds are unset", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    await notifyGoogleIndex("https://x/jobs/1", "URL_UPDATED");
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("never throws even if the token request fails", async () => {
    process.env.GOOGLE_INDEXING_CLIENT_EMAIL = "svc@example.iam.gserviceaccount.com";
    // A syntactically-plausible-but-invalid key; signing throws, must be swallowed.
    process.env.GOOGLE_INDEXING_PRIVATE_KEY =
      "-----BEGIN PRIVATE KEY-----\\nnope\\n-----END PRIVATE KEY-----";
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    await expect(notifyGoogleIndex("https://x/jobs/1", "URL_UPDATED")).resolves.toBeUndefined();
    expect(errSpy).toHaveBeenCalled();
  });
});
