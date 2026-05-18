import { prisma } from "@/lib/prisma";
import type { PrismaClient, PingResponse } from "@prisma/client";
import { JobClosureReason, JobStatus, ProfileStatus } from "@prisma/client";

export type RedeemResult =
  | { status: "success"; targetType: string }
  | { status: "expired" }
  | { status: "already-used" }
  | { status: "invalid" };

export async function redeemToken(
  tokenStr: string,
  db: PrismaClient = prisma,
): Promise<RedeemResult> {
  const record = await db.freshnessToken.findUnique({
    where: { token: tokenStr },
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
    await db.verificationPing.update({
      where: { id: record.pingId },
      data: {
        respondedAt: now,
        response: record.action,
      },
    });

    await db.freshnessToken.updateMany({
      where: { pingId: record.pingId },
      data: { usedAt: now },
    });
  }

  return {
    status: "success",
    targetType: record.targetType,
  };
}

async function applySeekerAction(
  seekerProfileId: string,
  action: PingResponse,
  now: Date,
  db: PrismaClient,
): Promise<void> {
  switch (action) {
    case "CONFIRMED":
      await db.seekerProfile.update({
        where: { id: seekerProfileId },
        data: {
          lastVerifiedAt: now,
        },
      });
      return;

    case "NOT_LOOKING":
    case "PAUSED":
      await db.seekerProfile.update({
        where: { id: seekerProfileId },
        data: {
          status: ProfileStatus.PAUSED,
        },
      });
      return;

    default:
      return;
  }
}

async function applyJobAction(
  jobId: string,
  action: PingResponse,
  now: Date,
  db: PrismaClient,
): Promise<void> {
  switch (action) {
    case "CONFIRMED":
      await db.jobPosting.update({
        where: { id: jobId },
        data: {
          lastVerifiedAt: now,
        },
      });
      return;

    case "FILLED":
      await db.jobPosting.update({
        where: { id: jobId },
        data: {
          status: JobStatus.CLOSED,
          closureReason: JobClosureReason.FILLED_ON_SHEFA,
          closedAt: now,
        },
      });
      return;

    case "PAUSED":
      await db.jobPosting.update({
        where: { id: jobId },
        data: {
          status: JobStatus.PAUSED,
        },
      });
      return;

    default:
      return;
  }
}
