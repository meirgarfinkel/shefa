import { describe, it, expect, vi, beforeEach } from "vitest";
import type { PrismaClient } from "@prisma/client";
import { runMessageNotifyJob } from "../message-notify.job";

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
    message: {
      findFirst: vi.fn(),
    },
  };
}

function asDb(mock: ReturnType<typeof makeMockDb>): PrismaClient {
  return mock as unknown as PrismaClient;
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
    mockDb.notificationPreferences.findUnique.mockResolvedValue(PER_MESSAGE_PREFS);
    mockDb.user.findUnique.mockResolvedValue(RECIPIENT_USER);
    mockDb.message.findFirst.mockResolvedValue(LATEST_MESSAGE);

    await runMessageNotifyJob({ conversationId: CONV_ID, recipientId: RECIPIENT_ID }, asDb(mockDb));

    const { sendEmail } = await import("@/server/emails");
    expect(vi.mocked(sendEmail)).toHaveBeenCalledOnce();
    expect(vi.mocked(sendEmail)).toHaveBeenCalledWith(
      expect.objectContaining({ to: RECIPIENT_USER.email }),
    );
  });

  it("OFF preference → no email sent", async () => {
    mockDb.notificationPreferences.findUnique.mockResolvedValue(OFF_PREFS);

    await runMessageNotifyJob({ conversationId: CONV_ID, recipientId: RECIPIENT_ID }, asDb(mockDb));

    const { sendEmail } = await import("@/server/emails");
    expect(vi.mocked(sendEmail)).not.toHaveBeenCalled();
  });

  it("DAILY_DIGEST preference → no email sent", async () => {
    mockDb.notificationPreferences.findUnique.mockResolvedValue(DAILY_DIGEST_PREFS);

    await runMessageNotifyJob({ conversationId: CONV_ID, recipientId: RECIPIENT_ID }, asDb(mockDb));

    const { sendEmail } = await import("@/server/emails");
    expect(vi.mocked(sendEmail)).not.toHaveBeenCalled();
  });

  it("no preferences row → defaults to PER_MESSAGE → email sent", async () => {
    mockDb.notificationPreferences.findUnique.mockResolvedValue(null);
    mockDb.user.findUnique.mockResolvedValue(RECIPIENT_USER);
    mockDb.message.findFirst.mockResolvedValue(LATEST_MESSAGE);

    await runMessageNotifyJob({ conversationId: CONV_ID, recipientId: RECIPIENT_ID }, asDb(mockDb));

    const { sendEmail } = await import("@/server/emails");
    expect(vi.mocked(sendEmail)).toHaveBeenCalledOnce();
  });

  it("recipient user not found → no-op, no crash", async () => {
    mockDb.notificationPreferences.findUnique.mockResolvedValue(PER_MESSAGE_PREFS);
    mockDb.user.findUnique.mockResolvedValue(null);
    mockDb.message.findFirst.mockResolvedValue(LATEST_MESSAGE);

    await expect(
      runMessageNotifyJob({ conversationId: CONV_ID, recipientId: RECIPIENT_ID }, asDb(mockDb)),
    ).resolves.toBeUndefined();

    const { sendEmail } = await import("@/server/emails");
    expect(vi.mocked(sendEmail)).not.toHaveBeenCalled();
  });

  it("no messages in conversation → no-op, no crash", async () => {
    mockDb.notificationPreferences.findUnique.mockResolvedValue(PER_MESSAGE_PREFS);
    mockDb.user.findUnique.mockResolvedValue(RECIPIENT_USER);
    mockDb.message.findFirst.mockResolvedValue(null);

    await expect(
      runMessageNotifyJob({ conversationId: CONV_ID, recipientId: RECIPIENT_ID }, asDb(mockDb)),
    ).resolves.toBeUndefined();

    const { sendEmail } = await import("@/server/emails");
    expect(vi.mocked(sendEmail)).not.toHaveBeenCalled();
  });

  it("email subject contains 'message'", async () => {
    mockDb.notificationPreferences.findUnique.mockResolvedValue(PER_MESSAGE_PREFS);
    mockDb.user.findUnique.mockResolvedValue(RECIPIENT_USER);
    mockDb.message.findFirst.mockResolvedValue(LATEST_MESSAGE);

    await runMessageNotifyJob({ conversationId: CONV_ID, recipientId: RECIPIENT_ID }, asDb(mockDb));

    const { sendEmail } = await import("@/server/emails");
    const call = vi.mocked(sendEmail).mock.calls[0]![0];
    expect(call.subject.toLowerCase()).toContain("message");
  });

  it("email html contains conversation ID for the link", async () => {
    mockDb.notificationPreferences.findUnique.mockResolvedValue(PER_MESSAGE_PREFS);
    mockDb.user.findUnique.mockResolvedValue(RECIPIENT_USER);
    mockDb.message.findFirst.mockResolvedValue(LATEST_MESSAGE);

    await runMessageNotifyJob({ conversationId: CONV_ID, recipientId: RECIPIENT_ID }, asDb(mockDb));

    const { sendEmail } = await import("@/server/emails");
    const call = vi.mocked(sendEmail).mock.calls[0]![0];
    expect(call.html).toContain(CONV_ID);
  });
});
