import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";
import type { PrismaClient, PingResponse } from "@/generated/prisma/client";

const DAY_MS = 24 * 60 * 60 * 1000;

export function generateTokenString(): string {
  return randomBytes(32).toString("hex");
}

export async function createFreshnessTokensForPing(
  pingId: string,
  targetType: string,
  targetId: string,
  actions: PingResponse[],
  db: PrismaClient = prisma,
): Promise<Record<string, string>> {
  const expiresAt = new Date(Date.now() + 30 * DAY_MS);

  const created = await Promise.all(
    actions.map(async (action) => {
      const token = generateTokenString();
      await db.freshnessToken.create({
        data: { token, targetType, targetId, action, pingId, expiresAt },
      });
      return [action, token] as [string, string];
    }),
  );

  return Object.fromEntries(created);
}
