import { prisma } from "@/lib/prisma";
import type { PrismaClient } from "@prisma/client";
import { sendEmail } from "@/server/emails";
import {
  buildDailyDigestEmail,
  type MessageGroup,
  type ApplicationGroup,
} from "@/server/emails/daily-digest";

export async function runDailyDigestJob(db: PrismaClient = prisma): Promise<void> {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const prefsWithUsers = await db.notificationPreferences.findMany({
    where: {
      OR: [{ messageNotifications: "DAILY_DIGEST" }, { applicationNotifications: "DAILY_DIGEST" }],
    },
    include: {
      user: { select: { id: true, email: true } },
    },
  });

  for (const prefs of prefsWithUsers) {
    try {
      const messageGroups: MessageGroup[] = [];
      const applicationGroups: ApplicationGroup[] = [];

      if (prefs.messageNotifications === "DAILY_DIGEST") {
        const messages = await db.message.findMany({
          where: {
            readAt: null,
            createdAt: { gte: since },
            senderId: { not: prefs.userId },
            conversation: {
              OR: [{ participantAId: prefs.userId }, { participantBId: prefs.userId }],
            },
          },
          include: {
            sender: { select: { email: true } },
            conversation: { select: { id: true } },
          },
          orderBy: { createdAt: "asc" },
        });

        const convMap = new Map<
          string,
          { senderEmail: string; latestPreview: string; messageCount: number }
        >();
        for (const msg of messages) {
          const existing = convMap.get(msg.conversation.id);
          if (existing) {
            existing.messageCount++;
            existing.latestPreview = msg.body;
            existing.senderEmail = msg.sender.email;
          } else {
            convMap.set(msg.conversation.id, {
              senderEmail: msg.sender.email,
              latestPreview: msg.body,
              messageCount: 1,
            });
          }
        }

        for (const [conversationId, data] of convMap) {
          messageGroups.push({ conversationId, ...data });
        }
      }

      if (prefs.applicationNotifications === "DAILY_DIGEST") {
        const applications = await db.application.findMany({
          where: {
            createdAt: { gte: since },
            job: { postedById: prefs.userId },
          },
          include: {
            job: { select: { id: true, title: true } },
          },
          orderBy: { createdAt: "desc" },
        });

        const jobMap = new Map<string, { jobTitle: string; applicationCount: number }>();
        for (const app of applications) {
          const existing = jobMap.get(app.job.id);
          if (existing) {
            existing.applicationCount++;
          } else {
            jobMap.set(app.job.id, { jobTitle: app.job.title, applicationCount: 1 });
          }
        }

        for (const [jobId, data] of jobMap) {
          applicationGroups.push({ jobId, ...data });
        }
      }

      if (messageGroups.length === 0 && applicationGroups.length === 0) continue;

      const appUrl = process.env.AUTH_URL ?? "http://localhost:3000";
      const emailContent = buildDailyDigestEmail({ messageGroups, applicationGroups, appUrl });

      await sendEmail({
        to: prefs.user.email,
        subject: emailContent.subject,
        html: emailContent.html,
      });
    } catch (err) {
      console.error(`[daily-digest] Failed to send digest to ${prefs.user.email}:`, err);
    }
  }
}
