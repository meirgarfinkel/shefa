import { eq } from "drizzle-orm";
import { db as defaultDb } from "@/db";
import type { DbClient } from "@/db";
import { sendEmail } from "@/server/emails";
import {
  buildSeekerInitialPingEmail,
  buildSeekerWarningEmail,
  buildJobInitialPingEmail,
  buildJobWarningEmail,
} from "@/server/emails/freshness-ping";
import { seekerProfile, jobPosting, verificationPing, freshnessToken } from "@/db/schema";
import { createFreshnessTokensForPing } from "./token";
import { getAppUrl } from "@/server/app-url";

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
  db: DbClient = defaultDb,
  now: Date = new Date(),
): Promise<void> {
  await Promise.all([checkSeekerProfiles(db, now), checkJobPostings(db, now)]);
}

async function checkSeekerProfiles(db: DbClient, now: Date): Promise<void> {
  const lookbackCutoff = new Date(now.getTime() - 35 * DAY_MS);

  const profiles = await db.query.seekerProfile.findMany({
    where: eq(seekerProfile.status, "ACTIVE"),
    with: {
      verificationPings: {
        where: (ping, { gte }) => gte(ping.sentAt, lookbackCutoff),
        orderBy: (ping, { asc }) => [asc(ping.sentAt)],
      },
      user: { columns: { id: true, email: true } },
    },
  });

  for (const profile of profiles) {
    if (!profile.user) continue;

    // Isolate each profile: a single failing send must not abort the whole batch.
    try {
      const pingsInCycle = profile.verificationPings.filter(
        (p) => p.sentAt >= profile.lastVerifiedAt,
      );
      const action = computeFreshnessAction(profile.lastVerifiedAt, pingsInCycle, now);

      if (action === "no-action") continue;

      if (action === "auto-pause") {
        await db
          .update(seekerProfile)
          .set({ status: "PAUSED" })
          .where(eq(seekerProfile.id, profile.id));
        if (pingsInCycle.length > 0) {
          const latestPing = pingsInCycle[pingsInCycle.length - 1]!;
          await db
            .update(verificationPing)
            .set({ respondedAt: now, response: "NO_RESPONSE" })
            .where(eq(verificationPing.id, latestPing.id));
        }
        continue;
      }

      const [ping] = await db
        .insert(verificationPing)
        .values({ type: "SEEKER_STILL_LOOKING", userId: profile.user.id })
        .returning();

      // Tokens must exist before the email (the links embed them). If the send fails,
      // roll the ping + tokens back so this undelivered ping isn't counted toward
      // escalation — otherwise a transient Resend failure could march an active user to
      // PAUSED without them ever receiving a warning.
      try {
        const tokens = await createFreshnessTokensForPing(
          ping!.id,
          "SEEKER_PROFILE",
          profile.id,
          ["CONFIRMED", "PAUSED", "NOT_LOOKING"],
          db,
        );

        const appUrl = getAppUrl();
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
      } catch (sendErr) {
        await db.delete(freshnessToken).where(eq(freshnessToken.pingId, ping!.id));
        await db.delete(verificationPing).where(eq(verificationPing.id, ping!.id));
        throw sendErr;
      }
    } catch (err) {
      console.error(`[freshness] Failed to process seeker profile ${profile.id}:`, err);
    }
  }
}

async function checkJobPostings(db: DbClient, now: Date): Promise<void> {
  const lookbackCutoff = new Date(now.getTime() - 35 * DAY_MS);

  const jobs = await db.query.jobPosting.findMany({
    where: eq(jobPosting.status, "ACTIVE"),
    with: {
      verificationPings: {
        where: (ping, { gte }) => gte(ping.sentAt, lookbackCutoff),
        orderBy: (ping, { asc }) => [asc(ping.sentAt)],
      },
      employer: { columns: { id: true, email: true } },
    },
  });

  for (const job of jobs) {
    // Isolate each job: a single failing send must not abort the whole batch.
    try {
      const pingsInCycle = job.verificationPings.filter((p) => p.sentAt >= job.lastVerifiedAt);
      const action = computeFreshnessAction(job.lastVerifiedAt, pingsInCycle, now);

      if (action === "no-action") continue;

      if (action === "auto-pause") {
        await db.update(jobPosting).set({ status: "PAUSED" }).where(eq(jobPosting.id, job.id));
        if (pingsInCycle.length > 0) {
          const latestPing = pingsInCycle[pingsInCycle.length - 1]!;
          await db
            .update(verificationPing)
            .set({ respondedAt: now, response: "NO_RESPONSE" })
            .where(eq(verificationPing.id, latestPing.id));
        }
        continue;
      }

      const [ping] = await db
        .insert(verificationPing)
        .values({ type: "JOB_STILL_OPEN", jobId: job.id })
        .returning();

      // See the seeker loop: send after tokens exist, roll back on failure so an
      // undelivered ping doesn't push an active listing toward auto-pause.
      try {
        const tokens = await createFreshnessTokensForPing(
          ping!.id,
          "JOB_POSTING",
          job.id,
          ["CONFIRMED", "PAUSED", "FILLED"],
          db,
        );

        const appUrl = getAppUrl();
        const tokenUrls = {
          confirm: `${appUrl}/api/verify/${tokens.CONFIRMED}`,
          pause: `${appUrl}/api/verify/${tokens.PAUSED}`,
          filled: `${appUrl}/api/verify/${tokens.FILLED}`,
        };

        const emailContent =
          action === "send-initial-ping"
            ? buildJobInitialPingEmail(job.employer.email, job.title, tokenUrls)
            : buildJobWarningEmail(job.employer.email, job.title, tokenUrls);

        await sendEmail({
          to: job.employer.email,
          subject: emailContent.subject,
          html: emailContent.html,
        });
      } catch (sendErr) {
        await db.delete(freshnessToken).where(eq(freshnessToken.pingId, ping!.id));
        await db.delete(verificationPing).where(eq(verificationPing.id, ping!.id));
        throw sendErr;
      }
    } catch (err) {
      console.error(`[freshness] Failed to process job posting ${job.id}:`, err);
    }
  }
}
