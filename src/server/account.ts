import { and, eq, ne, inArray } from "drizzle-orm";
import type { DbClient } from "@/db";
import {
  users,
  accounts,
  sessions,
  jobPosting,
  application,
  seekerProfile,
  employerProfile,
  notificationPreferences,
} from "@/db/schema";

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
  roleAtBusiness: null,
  status: "DELETED",
} satisfies Partial<typeof employerProfile.$inferInsert>;

export async function softDeleteAccount(db: DbClient, userId: string): Promise<void> {
  const now = new Date();
  // The Neon HTTP driver does not support interactive transactions (`db.transaction`
  // throws), so we use `db.batch`, which executes the statements atomically in a single
  // round trip. Each statement is keyed by userId and idempotent, so a retry is safe.
  await db.batch([
    db.update(users).set(anonymizedUserFields(userId, now)).where(eq(users.id, userId)),

    // Close any still-open jobs; leave already-closed jobs (and their original closure
    // reason/timestamp) untouched.
    db
      .update(jobPosting)
      .set({ status: "CLOSED", closureReason: "CANCELLED", closedAt: now })
      .where(and(eq(jobPosting.employerId, userId), ne(jobPosting.status, "CLOSED"))),

    // Mirror the job-close cascade (jobPosting.close): close the deleted employer's
    // still-open applications so no CLOSED job is left with live applications. A
    // REJECTED application stays REJECTED. We replicate the cascade inline here
    // because db.batch can't invoke the procedure, and the account is gone so the
    // job can never be reopened to undo it.
    db
      .update(application)
      .set({ status: "CLOSED", closedAt: now })
      .where(
        and(
          inArray(
            application.jobId,
            db
              .select({ id: jobPosting.id })
              .from(jobPosting)
              .where(eq(jobPosting.employerId, userId)),
          ),
          inArray(application.status, ["SUBMITTED", "VIEWED"]),
        ),
      ),

    db
      .update(seekerProfile)
      .set(anonymizedSeekerProfileFields)
      .where(eq(seekerProfile.userId, userId)),
    db
      .update(employerProfile)
      .set(anonymizedEmployerProfileFields)
      .where(eq(employerProfile.userId, userId)),

    // Drop notification preferences so the digest cron can never email the tombstoned
    // (non-routable) address after deletion.
    db.delete(notificationPreferences).where(eq(notificationPreferences.userId, userId)),

    // Sever the auth identity. The Google account link is removed so re-signup is clean;
    // the JWT client signs itself out after the mutation resolves.
    db.delete(accounts).where(eq(accounts.userId, userId)),
    db.delete(sessions).where(eq(sessions.userId, userId)),
  ]);
}
