import { prisma } from "@/lib/prisma";
import type { PrismaClient } from "@prisma/client";
import { sendEmail } from "@/server/emails";
import { buildMessageNotifyEmail } from "@/server/emails/message-notify";

export async function runMessageNotifyJob(
  data: { conversationId: string; recipientId: string },
  db: PrismaClient = prisma,
): Promise<void> {
  const { conversationId, recipientId } = data;

  const prefs = await db.notificationPreferences.findUnique({
    where: { userId: recipientId },
  });

  const freq = prefs?.messageNotifications ?? "PER_MESSAGE";
  if (freq === "OFF" || freq === "DAILY_DIGEST") return;

  const [recipient, latestMessage] = await Promise.all([
    db.user.findUnique({
      where: { id: recipientId },
      select: { email: true },
    }),
    db.message.findFirst({
      where: { conversationId },
      orderBy: { createdAt: "desc" },
      include: { sender: { select: { email: true } } },
    }),
  ]);

  if (!recipient || !latestMessage) return;

  const appUrl = process.env.AUTH_URL ?? "http://localhost:3000";
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
