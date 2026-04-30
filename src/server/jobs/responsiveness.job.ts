import { prisma } from "@/lib/prisma";
import type { PrismaClient } from "@prisma/client";

export interface ResponsivenessResult {
  score: number | null;
  isResponsive: boolean;
  scoreableCount: number;
  medianResponseHours: number | null;
  responseRate: number | null;
}

type ConversationWithMessages = {
  messages: { senderId: string; createdAt: Date }[];
};

const RESPONSIVE_WINDOW_MS = 72 * 60 * 60 * 1000; // 72 hours
const MIN_SCOREABLE_CONVERSATIONS = 3;
const RESPONSIVE_THRESHOLD = 0.7;

function median(sorted: number[]): number {
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid]! : (sorted[mid - 1]! + sorted[mid]!) / 2;
}

export function computeResponsivenessScore(
  employerUserId: string,
  conversations: ConversationWithMessages[],
): ResponsivenessResult {
  let scoreableCount = 0;
  let timelyCount = 0;
  const responseTimesMs: number[] = [];

  for (const conv of conversations) {
    const msgs = conv.messages
      .slice()
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

    // Find the first message NOT from the employer
    const firstOtherMsg = msgs.find((m) => m.senderId !== employerUserId);
    if (!firstOtherMsg) continue; // no scoreable opportunity

    scoreableCount++;

    // Find the employer's first reply AFTER the other party's first message
    const firstReply = msgs.find(
      (m) =>
        m.senderId === employerUserId && m.createdAt.getTime() > firstOtherMsg.createdAt.getTime(),
    );

    if (!firstReply) continue;

    const responseMs = firstReply.createdAt.getTime() - firstOtherMsg.createdAt.getTime();
    responseTimesMs.push(responseMs);

    if (responseMs <= RESPONSIVE_WINDOW_MS) {
      timelyCount++;
    }
  }

  if (scoreableCount === 0) {
    return {
      score: null,
      isResponsive: false,
      scoreableCount: 0,
      medianResponseHours: null,
      responseRate: null,
    };
  }

  const score = timelyCount / scoreableCount;

  const medianResponseHours =
    responseTimesMs.length > 0
      ? median(responseTimesMs.slice().sort((a, b) => a - b)) / (60 * 60 * 1000)
      : null;

  const isResponsive =
    score >= RESPONSIVE_THRESHOLD && scoreableCount >= MIN_SCOREABLE_CONVERSATIONS;

  return {
    score,
    isResponsive,
    scoreableCount,
    medianResponseHours,
    responseRate: score,
  };
}

export async function runResponsivenessJob(db: PrismaClient = prisma): Promise<void> {
  const employers = await db.employerProfile.findMany({
    select: {
      id: true,
      userId: true,
      user: {
        select: {
          conversationsAsA: {
            select: {
              messages: { select: { senderId: true, createdAt: true } },
            },
          },
          conversationsAsB: {
            select: {
              messages: { select: { senderId: true, createdAt: true } },
            },
          },
        },
      },
    },
  });

  for (const employer of employers) {
    try {
      const allConversations = [
        ...employer.user.conversationsAsA,
        ...employer.user.conversationsAsB,
      ];

      const result = computeResponsivenessScore(employer.userId, allConversations);

      await db.employerProfile.update({
        where: { id: employer.id },
        data: {
          isResponsive: result.isResponsive,
          responsivenessScore: result.score,
          responseRate: result.responseRate,
          medianResponseHours: result.medianResponseHours,
          responsivenessUpdatedAt: new Date(),
        },
      });
    } catch (err) {
      console.error(`[responsiveness] Failed to update employer ${employer.id}:`, err);
    }
  }
}
