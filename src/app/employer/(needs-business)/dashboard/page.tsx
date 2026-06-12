import { eq, and, asc, count, inArray } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db";
import { employerProfile, business, jobPosting } from "@/db/schema";
import { EmployerDashboardClient } from "./_client";

export default async function EmployerDashboardPage() {
  const session = await auth();
  const userId = session!.user!.id!;

  const [profile, businesses] = await Promise.all([
    db.query.employerProfile.findFirst({
      where: eq(employerProfile.userId, userId),
      columns: { firstName: true, isResponsive: true, responsivenessUpdatedAt: true },
    }),
    db.query.business.findMany({
      where: eq(business.ownerId, userId),
      orderBy: asc(business.name),
      columns: { id: true, name: true, city: true, state: true },
    }),
  ]);

  const businessIds = businesses.map((c) => c.id);
  const countRows =
    businessIds.length > 0
      ? await db
          .select({ businessId: jobPosting.businessId, count: count() })
          .from(jobPosting)
          .where(and(eq(jobPosting.status, "ACTIVE"), inArray(jobPosting.businessId, businessIds)))
          .groupBy(jobPosting.businessId)
      : [];

  const countMap = new Map(countRows.map((r) => [r.businessId, r.count]));

  const businessesForClient = businesses.map((c) => ({
    id: c.id,
    businessName: c.name,
    city: c.city,
    state: c.state,
    activeJobsCount: countMap.get(c.id) ?? 0,
  }));

  return <EmployerDashboardClient profile={profile!} businesses={businessesForClient} />;
}
