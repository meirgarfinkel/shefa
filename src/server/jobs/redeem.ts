import { prisma } from "@/lib/prisma";
import type { PrismaClient } from "@/generated/prisma/client";

export type RedeemResult =
  | { status: "success"; targetType: string }
  | { status: "expired" }
  | { status: "already-used" }
  | { status: "invalid" };

export async function redeemToken(
  tokenStr: string,
  db: PrismaClient = prisma,
): Promise<RedeemResult> {
  const record = await db.freshnessToken.findUnique({ where: { token: tokenStr } });

  if (!record) return { status: "invalid" };
  if (record.usedAt) return { status: "already-used" };
  if (record.expiresAt < new Date()) return { status: "expired" };

  const now = new Date();

  if (record.targetType === "SEEKER_PROFILE") {
    await applySeekerAction(record.targetId, record.action, now, db);
  } else if (record.targetType === "JOB_POSTING") {
    await applyJobAction(record.targetId, record.action, now, db);
  }

  if (record.pingId) {
    await db.verificationPing.update({
      where: { id: record.pingId },
      data: { respondedAt: now, response: record.action },
    });
    await db.freshnessToken.updateMany({
      where: { pingId: record.pingId },
      data: { usedAt: now },
    });
  }

  return { status: "success", targetType: record.targetType };
}

async function applySeekerAction(
  seekerProfileId: string,
  action: string,
  now: Date,
  db: PrismaClient,
): Promise<void> {
  if (action === "CONFIRMED") {
    await db.seekerProfile.update({
      where: { id: seekerProfileId },
      data: { lastVerifiedAt: now },
    });
  } else {
    // PAUSED, NOT_LOOKING, or any unrecognised seeker action → pause
    await db.seekerProfile.update({
      where: { id: seekerProfileId },
      data: { status: "PAUSED" },
    });
  }
}

async function applyJobAction(
  jobId: string,
  action: string,
  now: Date,
  db: PrismaClient,
): Promise<void> {
  if (action === "CONFIRMED") {
    await db.jobPosting.update({
      where: { id: jobId },
      data: { lastVerifiedAt: now },
    });
  } else if (action === "FILLED") {
    await db.jobPosting.update({
      where: { id: jobId },
      data: { status: "FILLED" },
    });
  } else {
    // PAUSED or any unrecognised job action → pause
    await db.jobPosting.update({
      where: { id: jobId },
      data: { status: "PAUSED" },
    });
  }
}
