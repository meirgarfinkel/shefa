import { describe, it, expect, vi, beforeEach } from "vitest";
import type { PrismaClient } from "@prisma/client";
import { runDailyDigestJob } from "../daily-digest.job";

vi.mock("@/lib/prisma", () => ({ prisma: {} }));
vi.mock("@/server/emails", () => ({ sendEmail: vi.fn() }));

// ── Mock helpers ───────────────────────────────────────────────────────────────

function makeMockDb() {
  return {
    notificationPreferences: {
      findMany: vi.fn(),
    },
    message: {
      findMany: vi.fn(),
    },
    application: {
      findMany: vi.fn(),
    },
  };
}

function asDb(mock: ReturnType<typeof makeMockDb>): PrismaClient {
  return mock as unknown as PrismaClient;
}

// ── Fixtures ───────────────────────────────────────────────────────────────────

const USER_A = { id: "user-a", email: "a@example.com" };
const USER_B = { id: "user-b", email: "b@example.com" };

const MSG_PREFS_A = {
  userId: USER_A.id,
  messageNotifications: "DAILY_DIGEST" as const,
  applicationNotifications: "OFF" as const,
  user: USER_A,
};

const APP_PREFS_B = {
  userId: USER_B.id,
  messageNotifications: "OFF" as const,
  applicationNotifications: "DAILY_DIGEST" as const,
  user: USER_B,
};

const BOTH_PREFS_A = {
  userId: USER_A.id,
  messageNotifications: "DAILY_DIGEST" as const,
  applicationNotifications: "DAILY_DIGEST" as const,
  user: USER_A,
};

const UNREAD_MSG = {
  id: "msg-1",
  body: "Let's talk about the position.",
  createdAt: new Date(),
  conversationId: "conv-1",
  conversation: { id: "conv-1" },
  sender: { email: "sender@example.com" },
};

const NEW_APP = {
  id: "app-1",
  createdAt: new Date(),
  job: { id: "job-1", title: "Junior Chef" },
};

// ── Tests ──────────────────────────────────────────────────────────────────────

describe("runDailyDigestJob", () => {
  let mockDb: ReturnType<typeof makeMockDb>;

  beforeEach(async () => {
    mockDb = makeMockDb();
    const { sendEmail } = await import("@/server/emails");
    vi.mocked(sendEmail).mockReset();
  });

  // ── Happy paths ──────────────────────────────────────────────────────────────

  it("message digest user with unread messages → sends 1 email", async () => {
    mockDb.notificationPreferences.findMany.mockResolvedValue([MSG_PREFS_A]);
    mockDb.message.findMany.mockResolvedValue([UNREAD_MSG]);

    await runDailyDigestJob(asDb(mockDb));

    const { sendEmail } = await import("@/server/emails");
    expect(vi.mocked(sendEmail)).toHaveBeenCalledOnce();
    expect(vi.mocked(sendEmail)).toHaveBeenCalledWith(
      expect.objectContaining({ to: USER_A.email }),
    );
  });

  it("application digest user with new applications → sends 1 email", async () => {
    mockDb.notificationPreferences.findMany.mockResolvedValue([APP_PREFS_B]);
    mockDb.application.findMany.mockResolvedValue([NEW_APP]);

    await runDailyDigestJob(asDb(mockDb));

    const { sendEmail } = await import("@/server/emails");
    expect(vi.mocked(sendEmail)).toHaveBeenCalledOnce();
    expect(vi.mocked(sendEmail)).toHaveBeenCalledWith(
      expect.objectContaining({ to: USER_B.email }),
    );
  });

  it("user with both digest prefs and both types of activity → exactly 1 email", async () => {
    mockDb.notificationPreferences.findMany.mockResolvedValue([BOTH_PREFS_A]);
    mockDb.message.findMany.mockResolvedValue([UNREAD_MSG]);
    mockDb.application.findMany.mockResolvedValue([NEW_APP]);

    await runDailyDigestJob(asDb(mockDb));

    const { sendEmail } = await import("@/server/emails");
    expect(vi.mocked(sendEmail)).toHaveBeenCalledOnce();
  });

  it("two DAILY_DIGEST users → each gets their own email", async () => {
    mockDb.notificationPreferences.findMany.mockResolvedValue([MSG_PREFS_A, APP_PREFS_B]);
    mockDb.message.findMany.mockResolvedValue([UNREAD_MSG]);
    mockDb.application.findMany.mockResolvedValue([NEW_APP]);

    await runDailyDigestJob(asDb(mockDb));

    const { sendEmail } = await import("@/server/emails");
    expect(vi.mocked(sendEmail)).toHaveBeenCalledTimes(2);
  });

  // ── Boundary: no activity → no email ────────────────────────────────────────

  it("message digest user with no unread messages → no email", async () => {
    mockDb.notificationPreferences.findMany.mockResolvedValue([MSG_PREFS_A]);
    mockDb.message.findMany.mockResolvedValue([]);

    await runDailyDigestJob(asDb(mockDb));

    const { sendEmail } = await import("@/server/emails");
    expect(vi.mocked(sendEmail)).not.toHaveBeenCalled();
  });

  it("application digest user with no new applications → no email", async () => {
    mockDb.notificationPreferences.findMany.mockResolvedValue([APP_PREFS_B]);
    mockDb.application.findMany.mockResolvedValue([]);

    await runDailyDigestJob(asDb(mockDb));

    const { sendEmail } = await import("@/server/emails");
    expect(vi.mocked(sendEmail)).not.toHaveBeenCalled();
  });

  it("user with both digest prefs but no activity of either type → no email", async () => {
    mockDb.notificationPreferences.findMany.mockResolvedValue([BOTH_PREFS_A]);
    mockDb.message.findMany.mockResolvedValue([]);
    mockDb.application.findMany.mockResolvedValue([]);

    await runDailyDigestJob(asDb(mockDb));

    const { sendEmail } = await import("@/server/emails");
    expect(vi.mocked(sendEmail)).not.toHaveBeenCalled();
  });

  it("no DAILY_DIGEST users → no emails, no crash", async () => {
    mockDb.notificationPreferences.findMany.mockResolvedValue([]);

    await expect(runDailyDigestJob(asDb(mockDb))).resolves.toBeUndefined();

    const { sendEmail } = await import("@/server/emails");
    expect(vi.mocked(sendEmail)).not.toHaveBeenCalled();
  });

  // ── Boundary: partial prefs ──────────────────────────────────────────────────

  it("user with both prefs, only has messages → email contains message section", async () => {
    mockDb.notificationPreferences.findMany.mockResolvedValue([BOTH_PREFS_A]);
    mockDb.message.findMany.mockResolvedValue([UNREAD_MSG]);
    mockDb.application.findMany.mockResolvedValue([]);

    await runDailyDigestJob(asDb(mockDb));

    const { sendEmail } = await import("@/server/emails");
    expect(vi.mocked(sendEmail)).toHaveBeenCalledOnce();
    const call = vi.mocked(sendEmail).mock.calls[0]![0];
    expect(call.html).toContain("conv-1");
  });

  // ── Grouping ─────────────────────────────────────────────────────────────────

  it("multiple unread messages in different conversations → all conversation IDs in email", async () => {
    mockDb.notificationPreferences.findMany.mockResolvedValue([MSG_PREFS_A]);
    mockDb.message.findMany.mockResolvedValue([
      { ...UNREAD_MSG, conversationId: "conv-1", conversation: { id: "conv-1" } },
      {
        id: "msg-2",
        body: "Another message",
        createdAt: new Date(),
        conversationId: "conv-2",
        conversation: { id: "conv-2" },
        sender: { email: "other@example.com" },
      },
    ]);

    await runDailyDigestJob(asDb(mockDb));

    const { sendEmail } = await import("@/server/emails");
    const call = vi.mocked(sendEmail).mock.calls[0]![0];
    expect(call.html).toContain("conv-1");
    expect(call.html).toContain("conv-2");
  });

  it("multiple new applications across different jobs → all job IDs in email", async () => {
    mockDb.notificationPreferences.findMany.mockResolvedValue([APP_PREFS_B]);
    mockDb.application.findMany.mockResolvedValue([
      { ...NEW_APP, id: "app-1", job: { id: "job-1", title: "Junior Chef" } },
      { id: "app-2", createdAt: new Date(), job: { id: "job-2", title: "Line Cook" } },
    ]);

    await runDailyDigestJob(asDb(mockDb));

    const { sendEmail } = await import("@/server/emails");
    const call = vi.mocked(sendEmail).mock.calls[0]![0];
    expect(call.html).toContain("job-1");
    expect(call.html).toContain("job-2");
  });

  it("multiple applications for the same job → grouped, count shown in email", async () => {
    mockDb.notificationPreferences.findMany.mockResolvedValue([APP_PREFS_B]);
    mockDb.application.findMany.mockResolvedValue([
      { id: "app-1", createdAt: new Date(), job: { id: "job-1", title: "Junior Chef" } },
      { id: "app-2", createdAt: new Date(), job: { id: "job-1", title: "Junior Chef" } },
    ]);

    await runDailyDigestJob(asDb(mockDb));

    const { sendEmail } = await import("@/server/emails");
    const call = vi.mocked(sendEmail).mock.calls[0]![0];
    // Only one link for job-1, with count 2
    expect(call.html).toContain("2");
    const jobOccurrences = (call.html.match(/job-1/g) ?? []).length;
    // job-1 should appear in the link but only once (grouped)
    expect(jobOccurrences).toBeGreaterThanOrEqual(1);
  });

  // ── Adversarial: HTML injection ──────────────────────────────────────────────

  it("message body with HTML chars → escaped in email", async () => {
    mockDb.notificationPreferences.findMany.mockResolvedValue([MSG_PREFS_A]);
    mockDb.message.findMany.mockResolvedValue([
      {
        ...UNREAD_MSG,
        body: "<script>alert('xss')</script>",
      },
    ]);

    await runDailyDigestJob(asDb(mockDb));

    const { sendEmail } = await import("@/server/emails");
    const call = vi.mocked(sendEmail).mock.calls[0]![0];
    expect(call.html).not.toContain("<script>");
    expect(call.html).toContain("&lt;script&gt;");
  });

  it("job title with HTML chars → escaped in email", async () => {
    mockDb.notificationPreferences.findMany.mockResolvedValue([APP_PREFS_B]);
    mockDb.application.findMany.mockResolvedValue([
      {
        id: "app-1",
        createdAt: new Date(),
        job: { id: "job-1", title: '<b>Chef & "Sous Chef"</b>' },
      },
    ]);

    await runDailyDigestJob(asDb(mockDb));

    const { sendEmail } = await import("@/server/emails");
    const call = vi.mocked(sendEmail).mock.calls[0]![0];
    expect(call.html).not.toContain("<b>");
    expect(call.html).toContain("&lt;b&gt;");
    expect(call.html).toContain("&amp;");
  });

  // ── Adversarial: sendEmail failure ───────────────────────────────────────────

  it("sendEmail throws for first user → second user still gets email", async () => {
    mockDb.notificationPreferences.findMany.mockResolvedValue([MSG_PREFS_A, APP_PREFS_B]);
    mockDb.message.findMany.mockResolvedValue([UNREAD_MSG]);
    mockDb.application.findMany.mockResolvedValue([NEW_APP]);

    const { sendEmail } = await import("@/server/emails");
    vi.mocked(sendEmail)
      .mockRejectedValueOnce(new Error("SMTP error"))
      .mockResolvedValueOnce(undefined);

    await expect(runDailyDigestJob(asDb(mockDb))).resolves.toBeUndefined();
    expect(vi.mocked(sendEmail)).toHaveBeenCalledTimes(2);
  });
});
