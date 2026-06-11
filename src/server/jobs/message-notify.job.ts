import { eq, desc } from "drizzle-orm";
import { db as defaultDb } from "@/db";
import type { DbClient } from "@/db";
import { sendEmail } from "@/server/emails";
import { buildMessageNotifyEmail } from "@/server/emails/message-notify";
import { getAppUrl } from "@/server/app-url";
import { notificationPreferences, users, message } from "@/db/schema";

export async function runMessageNotifyJob(
  data: { conversationId: string; recipientId: string },
  db: DbClient = defaultDb,
): Promise<void> {
  const { conversationId, recipientId } = data;

  const prefs = await db.query.notificationPreferences.findFirst({
    where: eq(notificationPreferences.userId, recipientId),
  });

  const freq = prefs?.messageNotifications ?? "PER_MESSAGE";
  if (freq === "OFF" || freq === "DAILY_DIGEST") return;

  const [recipient, latestMessage] = await Promise.all([
    db.query.users.findFirst({
      where: eq(users.id, recipientId),
      columns: { email: true },
    }),
    db.query.message.findFirst({
      where: eq(message.conversationId, conversationId),
      orderBy: desc(message.createdAt),
      with: { sender: { columns: { email: true } } },
    }),
  ]);

  if (!recipient || !latestMessage) return;

  const appUrl = getAppUrl();
  const emailContent = buildMessageNotifyEmail({
    senderEmail: latestMessage.sender.email,
    messagePreview: latestMessage.body,
    conversationId,
    appUrl,
  });

  await sendEmail({
    to: recipient.email,
    subject: emailContent.subject,
    html: emailContent.html,
  });
}
