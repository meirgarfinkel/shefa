import { prisma } from "@/lib/prisma";
import type { PrismaClient } from "@/generated/prisma/client";
import { sendEmail } from "@/server/emails";
import {
  buildSeekerInitialPingEmail,
  buildSeekerWarningEmail,
  buildJobInitialPingEmail,
  buildJobWarningEmail,
} from "@/server/emails/freshness-ping";
import { createFreshnessTokensForPing } from "./token";

const DAY_MS = 24 * 60 * 60 * 1000;

export type FreshnessAction =
  | "send-initial-ping"
  | "send-warning-ping"
  | "auto-pause"
  | "no-action";

export function computeFreshnessAction(
  lastVerifiedAt: Date,
  pingsInCycle: Array<{ respondedAt: Date | null }>,
  now: Date = new Date(),
): FreshnessAction {
  const daysSince = (now.getTime() - lastVerifiedAt.getTime()) / DAY_MS;

  if (daysSince < 14) return "no-action";

  const hasResponse = pingsInCycle.some((p) => p.respondedAt !== null);
  if (hasResponse) return "no-action";

  const unrespondedCount = pingsInCycle.length;

  if (daysSince >= 28 && unrespondedCount >= 1) return "auto-pause";
  if (unrespondedCount === 0) return "send-initial-ping";
  if (daysSince >= 20 && unrespondedCount === 1) return "send-warning-ping";

  return "no-action";
}

export async function runFreshnessCheck(
  db: PrismaClient = prisma,
  now: Date = new Date(),
): Promise<void> {
  await Promise.all([checkSeekerProfiles(db, now), checkJobPostings(db, now)]);
}

async function checkSeekerProfiles(db: PrismaClient, now: Date): Promise<void> {
  const lookbackCutoff = new Date(now.getTime() - 35 * DAY_MS);

  const profiles = await db.seekerProfile.findMany({
    where: { status: "ACTIVE" },
    include: {
      verificationPings: {
        where: { sentAt: { gte: lookbackCutoff } },
        orderBy: { sentAt: "asc" },
      },
      user: { select: { id: true, email: true } },
    },
  });

  for (const profile of profiles) {
    const pingsInCycle = profile.verificationPings.filter(
      (p) => p.sentAt >= profile.lastVerifiedAt,
    );
    const action = computeFreshnessAction(profile.lastVerifiedAt, pingsInCycle, now);

    if (action === "no-action") continue;

    if (action === "auto-pause") {
      await db.seekerProfile.update({
        where: { id: profile.id },
        data: { status: "PAUSED" },
      });
      if (pingsInCycle.length > 0) {
        const latestPing = pingsInCycle[pingsInCycle.length - 1]!;
        await db.verificationPing.update({
          where: { id: latestPing.id },
          data: { respondedAt: now, response: "NO_RESPONSE" },
        });
      }
      continue;
    }

    const ping = await db.verificationPing.create({
      data: {
        type: "SEEKER_STILL_LOOKING",
        userId: profile.user.id,
        seekerProfileId: profile.id,
      },
    });

    const tokens = await createFreshnessTokensForPing(
      ping.id,
      "SEEKER_PROFILE",
      profile.id,
      ["CONFIRMED", "PAUSED", "NOT_LOOKING"],
      db,
    );

    const appUrl = process.env.AUTH_URL ?? "http://localhost:3000";
    const tokenUrls = {
      confirm: `${appUrl}/api/verify/${tokens.CONFIRMED}`,
      pause: `${appUrl}/api/verify/${tokens.PAUSED}`,
      notLooking: `${appUrl}/api/verify/${tokens.NOT_LOOKING}`,
    };

    const emailContent =
      action === "send-initial-ping"
        ? buildSeekerInitialPingEmail(profile.user.email, tokenUrls)
        : buildSeekerWarningEmail(profile.user.email, tokenUrls);

    await sendEmail({
      to: profile.user.email,
      subject: emailContent.subject,
      html: emailContent.html,
    });
  }
}

async function checkJobPostings(db: PrismaClient, now: Date): Promise<void> {
  const lookbackCutoff = new Date(now.getTime() - 35 * DAY_MS);

  const jobs = await db.jobPosting.findMany({
    where: { status: "ACTIVE" },
    include: {
      verificationPings: {
        where: { sentAt: { gte: lookbackCutoff } },
        orderBy: { sentAt: "asc" },
      },
      postedBy: { select: { id: true, email: true } },
    },
  });

  for (const job of jobs) {
    const pingsInCycle = job.verificationPings.filter((p) => p.sentAt >= job.lastVerifiedAt);
    const action = computeFreshnessAction(job.lastVerifiedAt, pingsInCycle, now);

    if (action === "no-action") continue;

    if (action === "auto-pause") {
      await db.jobPosting.update({
        where: { id: job.id },
        data: { status: "PAUSED" },
      });
      if (pingsInCycle.length > 0) {
        const latestPing = pingsInCycle[pingsInCycle.length - 1]!;
        await db.verificationPing.update({
          where: { id: latestPing.id },
          data: { respondedAt: now, response: "NO_RESPONSE" },
        });
      }
      continue;
    }

    const ping = await db.verificationPing.create({
      data: { type: "JOB_STILL_OPEN", jobId: job.id },
    });

    const tokens = await createFreshnessTokensForPing(
      ping.id,
      "JOB_POSTING",
      job.id,
      ["CONFIRMED", "PAUSED", "FILLED"],
      db,
    );

    const appUrl = process.env.AUTH_URL ?? "http://localhost:3000";
    const tokenUrls = {
      confirm: `${appUrl}/api/verify/${tokens.CONFIRMED}`,
      pause: `${appUrl}/api/verify/${tokens.PAUSED}`,
      filled: `${appUrl}/api/verify/${tokens.FILLED}`,
    };

    const emailContent =
      action === "send-initial-ping"
        ? buildJobInitialPingEmail(job.postedBy.email, job.title, tokenUrls)
        : buildJobWarningEmail(job.postedBy.email, job.title, tokenUrls);

    await sendEmail({
      to: job.postedBy.email,
      subject: emailContent.subject,
      html: emailContent.html,
    });
  }
}
