import { describe, it, expect, vi, beforeEach } from "vitest";
import type { DbClient } from "@/db";
import { runMessageNotifyJob } from "../message-notify.job";

vi.mock("@/db", () => ({ db: {} }));
vi.mock("@/server/emails", () => ({ sendEmail: vi.fn() }));

// ── Mock helpers ───────────────────────────────────────────────────────────────

function makeMockDb() {
  return {
    query: {
      notificationPreferences: { findFirst: vi.fn() },
      users: { findFirst: vi.fn() },
      message: { findFirst: vi.fn() },
    },
  };
}

const RECIPIENT_ID = "user-recipient";
const CONV_ID = "conv-1";

const RECIPIENT_USER = { email: "recipient@example.com" };

const LATEST_MESSAGE = {
  id: "msg-1",
  body: "Hello, are you available?",
  createdAt: new Date(),
  sender: { email: "sender@example.com" },
};

const PER_MESSAGE_PREFS = { messageNotifications: "PER_MESSAGE" as const };
const DAILY_DIGEST_PREFS = { messageNotifications: "DAILY_DIGEST" as const };
const OFF_PREFS = { messageNotifications: "OFF" as const };

// ── runMessageNotifyJob ───────────────────────────────────────────────────────

describe("runMessageNotifyJob", () => {
  let mockDb: ReturnType<typeof makeMockDb>;

  beforeEach(async () => {
    mockDb = makeMockDb();
    const { sendEmail } = await import("@/server/emails");
    vi.mocked(sendEmail).mockReset();
  });

  it("happy path: PER_MESSAGE preference → sends email to recipient", async () => {
    mockDb.query.notificationPreferences.findFirst.mockResolvedValue(PER_MESSAGE_PREFS);
    mockDb.query.users.findFirst.mockResolvedValue(RECIPIENT_USER);
    mockDb.query.message.findFirst.mockResolvedValue(LATEST_MESSAGE);

    await runMessageNotifyJob(
      { conversationId: CONV_ID, recipientId: RECIPIENT_ID },
      mockDb as unknown as DbClient,
    );

    const { sendEmail } = await import("@/server/emails");
    expect(vi.mocked(sendEmail)).toHaveBeenCalledOnce();
    expect(vi.mocked(sendEmail)).toHaveBeenCalledWith(
      expect.objectContaining({ to: RECIPIENT_USER.email }),
    );
  });

  it("OFF preference → no email sent", async () => {
    mockDb.query.notificationPreferences.findFirst.mockResolvedValue(OFF_PREFS);

    await runMessageNotifyJob(
      { conversationId: CONV_ID, recipientId: RECIPIENT_ID },
      mockDb as unknown as DbClient,
    );

    const { sendEmail } = await import("@/server/emails");
    expect(vi.mocked(sendEmail)).not.toHaveBeenCalled();
  });

  it("DAILY_DIGEST preference → no email sent", async () => {
    mockDb.query.notificationPreferences.findFirst.mockResolvedValue(DAILY_DIGEST_PREFS);

    await runMessageNotifyJob(
      { conversationId: CONV_ID, recipientId: RECIPIENT_ID },
      mockDb as unknown as DbClient,
    );

    const { sendEmail } = await import("@/server/emails");
    expect(vi.mocked(sendEmail)).not.toHaveBeenCalled();
  });

  it("no preferences row → defaults to PER_MESSAGE → email sent", async () => {
    mockDb.query.notificationPreferences.findFirst.mockResolvedValue(null);
    mockDb.query.users.findFirst.mockResolvedValue(RECIPIENT_USER);
    mockDb.query.message.findFirst.mockResolvedValue(LATEST_MESSAGE);

    await runMessageNotifyJob(
      { conversationId: CONV_ID, recipientId: RECIPIENT_ID },
      mockDb as unknown as DbClient,
    );

    const { sendEmail } = await import("@/server/emails");
    expect(vi.mocked(sendEmail)).toHaveBeenCalledOnce();
  });

  it("recipient user not found → no-op, no crash", async () => {
    mockDb.query.notificationPreferences.findFirst.mockResolvedValue(PER_MESSAGE_PREFS);
    mockDb.query.users.findFirst.mockResolvedValue(null);
    mockDb.query.message.findFirst.mockResolvedValue(LATEST_MESSAGE);

    await expect(
      runMessageNotifyJob(
        { conversationId: CONV_ID, recipientId: RECIPIENT_ID },
        mockDb as unknown as DbClient,
      ),
    ).resolves.toBeUndefined();

    const { sendEmail } = await import("@/server/emails");
    expect(vi.mocked(sendEmail)).not.toHaveBeenCalled();
  });

  it("no messages in conversation → no-op, no crash", async () => {
    mockDb.query.notificationPreferences.findFirst.mockResolvedValue(PER_MESSAGE_PREFS);
    mockDb.query.users.findFirst.mockResolvedValue(RECIPIENT_USER);
    mockDb.query.message.findFirst.mockResolvedValue(null);

    await expect(
      runMessageNotifyJob(
        { conversationId: CONV_ID, recipientId: RECIPIENT_ID },
        mockDb as unknown as DbClient,
      ),
    ).resolves.toBeUndefined();

    const { sendEmail } = await import("@/server/emails");
    expect(vi.mocked(sendEmail)).not.toHaveBeenCalled();
  });

  it("email subject contains 'message'", async () => {
    mockDb.query.notificationPreferences.findFirst.mockResolvedValue(PER_MESSAGE_PREFS);
    mockDb.query.users.findFirst.mockResolvedValue(RECIPIENT_USER);
    mockDb.query.message.findFirst.mockResolvedValue(LATEST_MESSAGE);

    await runMessageNotifyJob(
      { conversationId: CONV_ID, recipientId: RECIPIENT_ID },
      mockDb as unknown as DbClient,
    );

    const { sendEmail } = await import("@/server/emails");
    const call = vi.mocked(sendEmail).mock.calls[0]![0];
    expect(call.subject.toLowerCase()).toContain("message");
  });

  it("email html contains conversation ID for the link", async () => {
    mockDb.query.notificationPreferences.findFirst.mockResolvedValue(PER_MESSAGE_PREFS);
    mockDb.query.users.findFirst.mockResolvedValue(RECIPIENT_USER);
    mockDb.query.message.findFirst.mockResolvedValue(LATEST_MESSAGE);

    await runMessageNotifyJob(
      { conversationId: CONV_ID, recipientId: RECIPIENT_ID },
      mockDb as unknown as DbClient,
    );

    const { sendEmail } = await import("@/server/emails");
    const call = vi.mocked(sendEmail).mock.calls[0]![0];
    expect(call.html).toContain(CONV_ID);
  });
});
