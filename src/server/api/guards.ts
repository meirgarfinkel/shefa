import { eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import type { DbClient } from "@/db";
import type { Role } from "@/db/schema/enums";
import { seekerProfile, employerProfile } from "@/db/schema";

/**
 * Soft-block enforcement: a SUSPENDED actor may sign in and view their own data,
 * but may not perform mutating actions (apply, post a job, start a conversation).
 * Throws FORBIDDEN if the caller's role-specific profile is not ACTIVE.
 *
 * No-op for ADMIN and for users without a profile yet (onboarding is gated elsewhere).
 */
export async function assertActorActive(
  db: DbClient,
  userId: string,
  role: Role | null | undefined,
): Promise<void> {
  if (role === "SEEKER") {
    const profile = await db.query.seekerProfile.findFirst({
      where: eq(seekerProfile.userId, userId),
      columns: { status: true },
    });
    if (profile && profile.status === "SUSPENDED") {
      throw new TRPCError({ code: "FORBIDDEN", message: "Your account is suspended" });
    }
  } else if (role === "EMPLOYER") {
    const profile = await db.query.employerProfile.findFirst({
      where: eq(employerProfile.userId, userId),
      columns: { status: true },
    });
    if (profile && profile.status === "SUSPENDED") {
      throw new TRPCError({ code: "FORBIDDEN", message: "Your account is suspended" });
    }
  }
}
