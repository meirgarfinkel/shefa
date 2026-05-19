import { eq, and, asc, count, inArray } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db";
import { employerProfile, company, jobPosting } from "@/db/schema";
import { EmployerDashboardClient } from "./_client";

export default async function EmployerDashboardPage() {
  const session = await auth();
  const userId = session!.user!.id!;

  const [profile, companies] = await Promise.all([
    db.query.employerProfile.findFirst({
      where: eq(employerProfile.userId, userId),
      columns: { firstName: true, isResponsive: true, responsivenessUpdatedAt: true },
    }),
    db.query.company.findMany({
      where: eq(company.ownerId, userId),
      orderBy: asc(company.name),
      columns: { id: true, name: true, city: true, state: true },
    }),
  ]);

  const companyIds = companies.map((c) => c.id);
  const countRows =
    companyIds.length > 0
      ? await db
          .select({ companyId: jobPosting.companyId, count: count() })
          .from(jobPosting)
          .where(and(eq(jobPosting.status, "ACTIVE"), inArray(jobPosting.companyId, companyIds)))
          .groupBy(jobPosting.companyId)
      : [];

  const countMap = new Map(countRows.map((r) => [r.companyId, r.count]));

  const companiesForClient = companies.map((c) => ({
    id: c.id,
    companyName: c.name,
    city: c.city,
    state: c.state,
    activeJobsCount: countMap.get(c.id) ?? 0,
  }));

  return <EmployerDashboardClient profile={profile!} companies={companiesForClient} />;
}
