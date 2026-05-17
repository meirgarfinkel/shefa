import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { EmployerDashboardClient } from "./_client";

export default async function EmployerDashboardPage() {
  const session = await auth();
  // Layout guarantees profile + company exist; we just need the userId
  const userId = session!.user!.id!;

  const [profile, companies] = await Promise.all([
    prisma.employerProfile.findUnique({
      where: { userId },
      select: { firstName: true, isResponsive: true, responsivenessUpdatedAt: true },
    }),
    prisma.company.findMany({
      where: { ownerId: userId },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        city: true,
        state: true,
        _count: { select: { jobs: { where: { status: "ACTIVE" } } } },
      },
    }),
  ]);

  const companiesForClient = companies.map((c) => ({
    id: c.id,
    companyName: c.name,
    city: c.city,
    state: c.state,
    activeJobsCount: c._count.jobs,
  }));

  return <EmployerDashboardClient profile={profile!} companies={companiesForClient} />;
}
