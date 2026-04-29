import { describe, it, expect, vi, beforeEach } from "vitest";
import type { PrismaClient } from "@prisma/client";
import { runApplicationNotifyJob } from "../application-notify.job";

vi.mock("@/lib/prisma", () => ({ prisma: {} }));
vi.mock("@/server/emails", () => ({ sendEmail: vi.fn() }));

// ── Mock helpers ───────────────────────────────────────────────────────────────

function makeMockDb() {
  return {
    notificationPreferences: {
      findUnique: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
    },
    jobPosting: {
      findUnique: vi.fn(),
    },
  };
}

function asDb(mock: ReturnType<typeof makeMockDb>): PrismaClient {
  return mock as unknown as PrismaClient;
}

const EMPLOYER_ID = "employer-1";
const JOB_ID = "job-1";

const EMPLOYER_USER = { email: "employer@example.com" };
const JOB = { id: JOB_ID, title: "Warehouse Associate" };

const PER_MESSAGE_PREFS = { applicationNotifications: "PER_MESSAGE" as const };
const DAILY_DIGEST_PREFS = { applicationNotifications: "DAILY_DIGEST" as const };
const OFF_PREFS = { applicationNotifications: "OFF" as const };

// ── runApplicationNotifyJob ────────────────────────────────────────────────────

describe("runApplicationNotifyJob", () => {
  let mockDb: ReturnType<typeof makeMockDb>;

  beforeEach(async () => {
    mockDb = makeMockDb();
    const { sendEmail } = await import("@/server/emails");
    vi.mocked(sendEmail).mockReset();
  });

  it("happy path: PER_MESSAGE preference → sends email to employer", async () => {
    mockDb.notificationPreferences.findUnique.mockResolvedValue(PER_MESSAGE_PREFS);
    mockDb.user.findUnique.mockResolvedValue(EMPLOYER_USER);
    mockDb.jobPosting.findUnique.mockResolvedValue(JOB);

    await runApplicationNotifyJob({ jobId: JOB_ID, employerId: EMPLOYER_ID }, asDb(mockDb));

    const { sendEmail } = await import("@/server/emails");
    expect(vi.mocked(sendEmail)).toHaveBeenCalledOnce();
    expect(vi.mocked(sendEmail)).toHaveBeenCalledWith(
      expect.objectContaining({ to: EMPLOYER_USER.email }),
    );
  });

  it("OFF preference → no email sent", async () => {
    mockDb.notificationPreferences.findUnique.mockResolvedValue(OFF_PREFS);

    await runApplicationNotifyJob({ jobId: JOB_ID, employerId: EMPLOYER_ID }, asDb(mockDb));

    const { sendEmail } = await import("@/server/emails");
    expect(vi.mocked(sendEmail)).not.toHaveBeenCalled();
  });

  it("DAILY_DIGEST preference → no email sent", async () => {
    mockDb.notificationPreferences.findUnique.mockResolvedValue(DAILY_DIGEST_PREFS);

    await runApplicationNotifyJob({ jobId: JOB_ID, employerId: EMPLOYER_ID }, asDb(mockDb));

    const { sendEmail } = await import("@/server/emails");
    expect(vi.mocked(sendEmail)).not.toHaveBeenCalled();
  });

  it("no preferences row → defaults to PER_MESSAGE → email sent", async () => {
    mockDb.notificationPreferences.findUnique.mockResolvedValue(null);
    mockDb.user.findUnique.mockResolvedValue(EMPLOYER_USER);
    mockDb.jobPosting.findUnique.mockResolvedValue(JOB);

    await runApplicationNotifyJob({ jobId: JOB_ID, employerId: EMPLOYER_ID }, asDb(mockDb));

    const { sendEmail } = await import("@/server/emails");
    expect(vi.mocked(sendEmail)).toHaveBeenCalledOnce();
  });

  it("employer user not found → no-op, no crash", async () => {
    mockDb.notificationPreferences.findUnique.mockResolvedValue(PER_MESSAGE_PREFS);
    mockDb.user.findUnique.mockResolvedValue(null);
    mockDb.jobPosting.findUnique.mockResolvedValue(JOB);

    await expect(
      runApplicationNotifyJob({ jobId: JOB_ID, employerId: EMPLOYER_ID }, asDb(mockDb)),
    ).resolves.toBeUndefined();

    const { sendEmail } = await import("@/server/emails");
    expect(vi.mocked(sendEmail)).not.toHaveBeenCalled();
  });

  it("job not found → no-op, no crash", async () => {
    mockDb.notificationPreferences.findUnique.mockResolvedValue(PER_MESSAGE_PREFS);
    mockDb.user.findUnique.mockResolvedValue(EMPLOYER_USER);
    mockDb.jobPosting.findUnique.mockResolvedValue(null);

    await expect(
      runApplicationNotifyJob({ jobId: JOB_ID, employerId: EMPLOYER_ID }, asDb(mockDb)),
    ).resolves.toBeUndefined();

    const { sendEmail } = await import("@/server/emails");
    expect(vi.mocked(sendEmail)).not.toHaveBeenCalled();
  });

  it("email subject includes job title", async () => {
    mockDb.notificationPreferences.findUnique.mockResolvedValue(PER_MESSAGE_PREFS);
    mockDb.user.findUnique.mockResolvedValue(EMPLOYER_USER);
    mockDb.jobPosting.findUnique.mockResolvedValue(JOB);

    await runApplicationNotifyJob({ jobId: JOB_ID, employerId: EMPLOYER_ID }, asDb(mockDb));

    const { sendEmail } = await import("@/server/emails");
    const call = vi.mocked(sendEmail).mock.calls[0]![0];
    expect(call.subject).toContain(JOB.title);
  });

  it("email html contains jobId for the link", async () => {
    mockDb.notificationPreferences.findUnique.mockResolvedValue(PER_MESSAGE_PREFS);
    mockDb.user.findUnique.mockResolvedValue(EMPLOYER_USER);
    mockDb.jobPosting.findUnique.mockResolvedValue(JOB);

    await runApplicationNotifyJob({ jobId: JOB_ID, employerId: EMPLOYER_ID }, asDb(mockDb));

    const { sendEmail } = await import("@/server/emails");
    const call = vi.mocked(sendEmail).mock.calls[0]![0];
    expect(call.html).toContain(JOB_ID);
  });
});
