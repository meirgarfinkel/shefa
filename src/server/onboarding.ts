import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db";
import { seekerProfile } from "@/db/schema";

/**
 * Onboarding gate for seekers. A logged-in SEEKER who has not yet created a
 * seekerProfile is redirected to profile creation, mirroring how the employer
 * `(needs-company)` layout gates employers who haven't finished onboarding.
 *
 * No-op for unauthenticated visitors, EMPLOYERs, and ADMINs — their gates (or
 * lack thereof) live elsewhere. The SEEKER role-gate itself lives in the seeker
 * server layouts; this only enforces profile existence.
 */
export async function redirectSeekerWithoutProfile(): Promise<void> {
  const session = await auth();
  if (session?.user?.role !== "SEEKER") return;

  const profile = await db.query.seekerProfile.findFirst({
    where: eq(seekerProfile.userId, session.user.id),
    columns: { id: true },
  });

  if (!profile) redirect("/seeker/profile/new");
}
