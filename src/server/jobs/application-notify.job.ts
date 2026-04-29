import { prisma } from "@/lib/prisma";
import type { PrismaClient } from "@prisma/client";
import { sendEmail } from "@/server/emails";
import { buildApplicationNotifyEmail } from "@/server/emails/application-notify";

export async function runApplicationNotifyJob(
  data: { jobId: string; employerId: string },
  db: PrismaClient = prisma,
): Promise<void> {
  const { jobId, employerId } = data;

  const prefs = await db.notificationPreferences.findUnique({
    where: { userId: employerId },
  });

  const freq = prefs?.applicationNotifications ?? "PER_MESSAGE";
  if (freq === "OFF" || freq === "DAILY_DIGEST") return;

  const [employer, job] = await Promise.all([
    db.user.findUnique({
      where: { id: employerId },
      select: { email: true },
    }),
    db.jobPosting.findUnique({
      where: { id: jobId },
      select: { title: true },
    }),
  ]);

  if (!employer || !job) return;

  const appUrl = process.env.AUTH_URL ?? "http://localhost:3000";
  const emailContent = buildApplicationNotifyEmail({
    jobTitle: job.title,
    jobId,
    appUrl,
  });

  await sendEmail({
    to: employer.email,
    subject: emailContent.subject,
    html: emailContent.html,
  });
}
