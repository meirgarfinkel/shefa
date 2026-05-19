import { eq } from "drizzle-orm";
import { db as defaultDb } from "@/db";
import type { DbClient } from "@/db";
import { employerProfile } from "@/db/schema";

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

const RESPONSIVE_WINDOW_MS = 72 * 60 * 60 * 1000;
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

    const firstOtherMsg = msgs.find((m) => m.senderId !== employerUserId);
    if (!firstOtherMsg) continue;

    scoreableCount++;

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

  return { score, isResponsive, scoreableCount, medianResponseHours, responseRate: score };
}

export async function runResponsivenessJob(db: DbClient = defaultDb): Promise<void> {
  const profileRows = await db.select({ userId: employerProfile.userId }).from(employerProfile);

  const employerProfileUserIds = profileRows.map((r) => r.userId);
  if (employerProfileUserIds.length === 0) return;

  const employers = await db.query.users.findMany({
    where: (u, { and, eq, inArray }) =>
      and(eq(u.role, "EMPLOYER"), inArray(u.id, employerProfileUserIds)),
    columns: { id: true },
    with: {
      conversationsAsEmployer: {
        with: {
          messages: {
            columns: { senderId: true, createdAt: true },
          },
        },
      },
    },
  });

  for (const employer of employers) {
    try {
      const result = computeResponsivenessScore(employer.id, employer.conversationsAsEmployer);

      await db
        .update(employerProfile)
        .set({ isResponsive: result.isResponsive, responsivenessUpdatedAt: new Date() })
        .where(eq(employerProfile.userId, employer.id));
    } catch (err) {
      console.error(`[responsiveness] Failed to update employer ${employer.id}:`, err);
    }
  }
}
