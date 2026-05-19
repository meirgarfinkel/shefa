import { eq, and, or, ne, gte, desc, asc, isNull, inArray } from "drizzle-orm";
import { db as defaultDb } from "@/db";
import type { DbClient } from "@/db";
import { sendEmail } from "@/server/emails";
import {
  buildDailyDigestEmail,
  type MessageGroup,
  type ApplicationGroup,
} from "@/server/emails/daily-digest";
import { message, conversation, application, jobPosting } from "@/db/schema";

export async function runDailyDigestJob(db: DbClient = defaultDb): Promise<void> {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const prefsWithUsers = await db.query.notificationPreferences.findMany({
    where: (p, { or, eq }) =>
      or(
        eq(p.messageNotifications, "DAILY_DIGEST"),
        eq(p.applicationNotifications, "DAILY_DIGEST"),
      ),
    with: {
      user: { columns: { id: true, email: true } },
    },
  });

  for (const prefs of prefsWithUsers) {
    if (!prefs.user) continue;

    try {
      const messageGroups: MessageGroup[] = [];
      const applicationGroups: ApplicationGroup[] = [];

      if (prefs.messageNotifications === "DAILY_DIGEST") {
        const userConvIds = db
          .select({ id: conversation.id })
          .from(conversation)
          .where(
            or(eq(conversation.seekerId, prefs.userId), eq(conversation.employerId, prefs.userId)),
          );

        const messages = await db.query.message.findMany({
          where: and(
            isNull(message.readAt),
            gte(message.createdAt, since),
            ne(message.senderId, prefs.userId),
            inArray(message.conversationId, userConvIds),
          ),
          with: {
            sender: { columns: { email: true } },
            conversation: { columns: { id: true } },
          },
          orderBy: asc(message.createdAt),
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
        const employerJobIds = db
          .select({ id: jobPosting.id })
          .from(jobPosting)
          .where(eq(jobPosting.employerId, prefs.userId));

        const applications = await db.query.application.findMany({
          where: and(gte(application.createdAt, since), inArray(application.jobId, employerJobIds)),
          with: {
            job: { columns: { id: true, title: true } },
          },
          orderBy: desc(application.createdAt),
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
