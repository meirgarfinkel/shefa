import { eq } from "drizzle-orm";
import { db as defaultDb } from "@/db";
import type { DbClient } from "@/db";
import { sendEmail } from "@/server/emails";
import { buildJobInitialPingEmail, buildJobWarningEmail } from "@/server/emails/freshness-ping";
import { jobPosting, verificationPing, freshnessToken } from "@/db/schema";
import { createFreshnessTokensForPing } from "./token";
import { getAppUrl } from "@/server/app-url";

const DAY_MS = 24 * 60 * 60 * 1000;

// A listing is auto-paused once it has gone this many days without verification.
const AUTO_PAUSE_DAYS = 28;

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
  await checkJobPostings(db, now);
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

        // The listing auto-pauses AUTO_PAUSE_DAYS after its last verification; surface
        // that exact horizon in the email so the employer knows the deadline.
        const pauseDate = new Date(job.lastVerifiedAt.getTime() + AUTO_PAUSE_DAYS * DAY_MS);

        const emailContent =
          action === "send-initial-ping"
            ? buildJobInitialPingEmail(job.employer.email, job.title, tokenUrls, pauseDate)
            : buildJobWarningEmail(job.employer.email, job.title, tokenUrls, pauseDate);

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
