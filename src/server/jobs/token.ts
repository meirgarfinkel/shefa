import { randomBytes } from "crypto";
import { db as defaultDb } from "@/db";
import type { DbClient } from "@/db";
import type { PingResponse } from "@/db/schema";
import { freshnessToken } from "@/db/schema";

const DAY_MS = 24 * 60 * 60 * 1000;

export function generateTokenString(): string {
  return randomBytes(32).toString("hex");
}

export async function createFreshnessTokensForPing(
  pingId: string,
  targetType: string,
  targetId: string,
  actions: PingResponse[],
  db: DbClient = defaultDb,
): Promise<Record<string, string>> {
  const expiresAt = new Date(Date.now() + 30 * DAY_MS);

  const created = await Promise.all(
    actions.map(async (action) => {
      const token = generateTokenString();
      await db
        .insert(freshnessToken)
        .values({ token, targetType, targetId, action, pingId, expiresAt });
      return [action, token] as [string, string];
    }),
  );

  return Object.fromEntries(created);
}
