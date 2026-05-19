import { eq } from "drizzle-orm";
import { db as defaultDb } from "@/db";
import type { DbClient } from "@/db";
import type { PingResponse } from "@/db/schema";
import { freshnessToken, verificationPing, seekerProfile, jobPosting } from "@/db/schema";

export type RedeemResult =
  | { status: "success"; targetType: string }
  | { status: "expired" }
  | { status: "already-used" }
  | { status: "invalid" };

export async function redeemToken(
  tokenStr: string,
  db: DbClient = defaultDb,
): Promise<RedeemResult> {
  const record = await db.query.freshnessToken.findFirst({
    where: eq(freshnessToken.token, tokenStr),
  });

  if (!record) return { status: "invalid" };
  if (record.usedAt) return { status: "already-used" };
  if (record.expiresAt < new Date()) return { status: "expired" };

  const now = new Date();

  if (record.targetType === "SEEKER_PROFILE") {
    await applySeekerAction(record.targetId, record.action, now, db);
  }

  if (record.targetType === "JOB_POSTING") {
    await applyJobAction(record.targetId, record.action, now, db);
  }

  if (record.pingId) {
    await db
      .update(verificationPing)
      .set({ respondedAt: now, response: record.action })
      .where(eq(verificationPing.id, record.pingId));

    await db
      .update(freshnessToken)
      .set({ usedAt: now })
      .where(eq(freshnessToken.pingId, record.pingId));
  }

  return { status: "success", targetType: record.targetType };
}

async function applySeekerAction(
  seekerProfileId: string,
  action: PingResponse,
  now: Date,
  db: DbClient,
): Promise<void> {
  switch (action) {
    case "CONFIRMED":
      await db
        .update(seekerProfile)
        .set({ lastVerifiedAt: now })
        .where(eq(seekerProfile.id, seekerProfileId));
      return;

    case "NOT_LOOKING":
    case "PAUSED":
      await db
        .update(seekerProfile)
        .set({ status: "PAUSED" })
        .where(eq(seekerProfile.id, seekerProfileId));
      return;

    default:
      return;
  }
}

async function applyJobAction(
  jobId: string,
  action: PingResponse,
  now: Date,
  db: DbClient,
): Promise<void> {
  switch (action) {
    case "CONFIRMED":
      await db.update(jobPosting).set({ lastVerifiedAt: now }).where(eq(jobPosting.id, jobId));
      return;

    case "FILLED":
      await db
        .update(jobPosting)
        .set({ status: "CLOSED", closureReason: "FILLED_ON_SHEFA", closedAt: now })
        .where(eq(jobPosting.id, jobId));
      return;

    case "PAUSED":
      await db.update(jobPosting).set({ status: "PAUSED" }).where(eq(jobPosting.id, jobId));
      return;

    default:
      return;
  }
}
