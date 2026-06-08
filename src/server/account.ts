import { and, eq, ne } from "drizzle-orm";
import type { DbClient } from "@/db";
import { users, accounts, sessions, jobPosting, seekerProfile, employerProfile } from "@/db/schema";

/**
 * Account deletion is a *soft* delete: the User row is preserved so that records the
 * other party interacted with (conversations, messages, applications, reports) stay
 * referentially intact. We scrub personal data, close the user's jobs, mark their
 * profile DELETED, and sever the auth link. Nothing is destructively cascaded.
 */

/** PII-scrubbing patch for the User row. */
export function anonymizedUserFields(userId: string, now: Date) {
  return {
    name: null,
    // Unique (satisfies the NOT NULL UNIQUE constraint) and non-routable, so a later
    // re-signup with the user's real Google email creates a fresh row rather than
    // re-linking this tombstone.
    email: `deleted-${userId}@deleted.shefa.invalid`,
    phone: null,
    image: null,
    deletedAt: now,
  } satisfies Partial<typeof users.$inferInsert>;
}

/** Genericised, hidden seeker profile. */
export const anonymizedSeekerProfileFields = {
  firstName: "Former",
  lastName: "member",
  about: null,
  jobSeekText: "",
  resumeUrl: null,
  educationLevel: null,
  status: "DELETED",
} satisfies Partial<typeof seekerProfile.$inferInsert>;

/** Genericised, hidden employer profile. */
export const anonymizedEmployerProfileFields = {
  firstName: "Former",
  lastName: "member",
  roleAtCompany: null,
  status: "DELETED",
} satisfies Partial<typeof employerProfile.$inferInsert>;

export async function softDeleteAccount(db: DbClient, userId: string): Promise<void> {
  const now = new Date();
  await db.transaction(async (tx) => {
    await tx.update(users).set(anonymizedUserFields(userId, now)).where(eq(users.id, userId));

    // Close any still-open jobs; leave already-closed jobs (and their original closure
    // reason/timestamp) untouched.
    await tx
      .update(jobPosting)
      .set({ status: "CLOSED", closureReason: "CANCELLED", closedAt: now })
      .where(and(eq(jobPosting.employerId, userId), ne(jobPosting.status, "CLOSED")));

    await tx
      .update(seekerProfile)
      .set(anonymizedSeekerProfileFields)
      .where(eq(seekerProfile.userId, userId));
    await tx
      .update(employerProfile)
      .set(anonymizedEmployerProfileFields)
      .where(eq(employerProfile.userId, userId));

    // Sever the auth identity. The Google account link is removed so re-signup is clean;
    // the JWT client signs itself out after the mutation resolves.
    await tx.delete(accounts).where(eq(accounts.userId, userId));
    await tx.delete(sessions).where(eq(sessions.userId, userId));
  });
}
