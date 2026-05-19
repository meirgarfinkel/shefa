import { eq } from "drizzle-orm";
import { db as defaultDb } from "@/db";
import type { DbClient } from "@/db";
import { sendEmail } from "@/server/emails";
import { buildApplicationNotifyEmail } from "@/server/emails/application-notify";
import { notificationPreferences, users, jobPosting } from "@/db/schema";

export async function runApplicationNotifyJob(
  data: { jobId: string; employerId: string },
  db: DbClient = defaultDb,
): Promise<void> {
  const { jobId, employerId } = data;

  const prefs = await db.query.notificationPreferences.findFirst({
    where: eq(notificationPreferences.userId, employerId),
  });

  const freq = prefs?.applicationNotifications ?? "PER_MESSAGE";
  if (freq === "OFF" || freq === "DAILY_DIGEST") return;

  const [employer, job] = await Promise.all([
    db.query.users.findFirst({
      where: eq(users.id, employerId),
      columns: { email: true },
    }),
    db.query.jobPosting.findFirst({
      where: eq(jobPosting.id, jobId),
      columns: { title: true },
    }),
  ]);

  if (!employer || !job) return;

  const appUrl = process.env.AUTH_URL ?? "http://localhost:3000";
  const emailContent = buildApplicationNotifyEmail({ jobTitle: job.title, jobId, appUrl });

  await sendEmail({
    to: employer.email,
    subject: emailContent.subject,
    html: emailContent.html,
  });
}
