import { describe, it, expect, vi, beforeEach } from "vitest";
import type { DbClient } from "@/db";
import { runApplicationNotifyJob } from "../application-notify.job";

vi.mock("@/db", () => ({ db: {} }));
vi.mock("@/server/emails", () => ({ sendEmail: vi.fn() }));

// ── Mock helpers ───────────────────────────────────────────────────────────────

function makeMockDb() {
  return {
    query: {
      notificationPreferences: { findFirst: vi.fn() },
      users: { findFirst: vi.fn() },
      jobPosting: { findFirst: vi.fn() },
    },
  };
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
    mockDb.query.notificationPreferences.findFirst.mockResolvedValue(PER_MESSAGE_PREFS);
    mockDb.query.users.findFirst.mockResolvedValue(EMPLOYER_USER);
    mockDb.query.jobPosting.findFirst.mockResolvedValue(JOB);

    await runApplicationNotifyJob(
      { jobId: JOB_ID, employerId: EMPLOYER_ID },
      mockDb as unknown as DbClient,
    );

    const { sendEmail } = await import("@/server/emails");
    expect(vi.mocked(sendEmail)).toHaveBeenCalledOnce();
    expect(vi.mocked(sendEmail)).toHaveBeenCalledWith(
      expect.objectContaining({ to: EMPLOYER_USER.email }),
    );
  });

  it("OFF preference → no email sent", async () => {
    mockDb.query.notificationPreferences.findFirst.mockResolvedValue(OFF_PREFS);

    await runApplicationNotifyJob(
      { jobId: JOB_ID, employerId: EMPLOYER_ID },
      mockDb as unknown as DbClient,
    );

    const { sendEmail } = await import("@/server/emails");
    expect(vi.mocked(sendEmail)).not.toHaveBeenCalled();
  });

  it("DAILY_DIGEST preference → no email sent", async () => {
    mockDb.query.notificationPreferences.findFirst.mockResolvedValue(DAILY_DIGEST_PREFS);

    await runApplicationNotifyJob(
      { jobId: JOB_ID, employerId: EMPLOYER_ID },
      mockDb as unknown as DbClient,
    );

    const { sendEmail } = await import("@/server/emails");
    expect(vi.mocked(sendEmail)).not.toHaveBeenCalled();
  });

  it("no preferences row → defaults to PER_MESSAGE → email sent", async () => {
    mockDb.query.notificationPreferences.findFirst.mockResolvedValue(null);
    mockDb.query.users.findFirst.mockResolvedValue(EMPLOYER_USER);
    mockDb.query.jobPosting.findFirst.mockResolvedValue(JOB);

    await runApplicationNotifyJob(
      { jobId: JOB_ID, employerId: EMPLOYER_ID },
      mockDb as unknown as DbClient,
    );

    const { sendEmail } = await import("@/server/emails");
    expect(vi.mocked(sendEmail)).toHaveBeenCalledOnce();
  });

  it("employer user not found → no-op, no crash", async () => {
    mockDb.query.notificationPreferences.findFirst.mockResolvedValue(PER_MESSAGE_PREFS);
    mockDb.query.users.findFirst.mockResolvedValue(null);
    mockDb.query.jobPosting.findFirst.mockResolvedValue(JOB);

    await expect(
      runApplicationNotifyJob(
        { jobId: JOB_ID, employerId: EMPLOYER_ID },
        mockDb as unknown as DbClient,
      ),
    ).resolves.toBeUndefined();

    const { sendEmail } = await import("@/server/emails");
    expect(vi.mocked(sendEmail)).not.toHaveBeenCalled();
  });

  it("job not found → no-op, no crash", async () => {
    mockDb.query.notificationPreferences.findFirst.mockResolvedValue(PER_MESSAGE_PREFS);
    mockDb.query.users.findFirst.mockResolvedValue(EMPLOYER_USER);
    mockDb.query.jobPosting.findFirst.mockResolvedValue(null);

    await expect(
      runApplicationNotifyJob(
        { jobId: JOB_ID, employerId: EMPLOYER_ID },
        mockDb as unknown as DbClient,
      ),
    ).resolves.toBeUndefined();

    const { sendEmail } = await import("@/server/emails");
    expect(vi.mocked(sendEmail)).not.toHaveBeenCalled();
  });

  it("email subject includes job title", async () => {
    mockDb.query.notificationPreferences.findFirst.mockResolvedValue(PER_MESSAGE_PREFS);
    mockDb.query.users.findFirst.mockResolvedValue(EMPLOYER_USER);
    mockDb.query.jobPosting.findFirst.mockResolvedValue(JOB);

    await runApplicationNotifyJob(
      { jobId: JOB_ID, employerId: EMPLOYER_ID },
      mockDb as unknown as DbClient,
    );

    const { sendEmail } = await import("@/server/emails");
    const call = vi.mocked(sendEmail).mock.calls[0]![0];
    expect(call.subject).toContain(JOB.title);
  });

  it("email html contains jobId for the link", async () => {
    mockDb.query.notificationPreferences.findFirst.mockResolvedValue(PER_MESSAGE_PREFS);
    mockDb.query.users.findFirst.mockResolvedValue(EMPLOYER_USER);
    mockDb.query.jobPosting.findFirst.mockResolvedValue(JOB);

    await runApplicationNotifyJob(
      { jobId: JOB_ID, employerId: EMPLOYER_ID },
      mockDb as unknown as DbClient,
    );

    const { sendEmail } = await import("@/server/emails");
    const call = vi.mocked(sendEmail).mock.calls[0]![0];
    expect(call.html).toContain(JOB_ID);
  });
});
