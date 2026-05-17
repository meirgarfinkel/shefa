import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export default async function EmployerOnboardedLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  const userId = session!.user!.id!;

  const [profile, firstCompany] = await Promise.all([
    prisma.employerProfile.findUnique({ where: { userId }, select: { id: true } }),
    prisma.company.findFirst({ where: { ownerId: userId }, select: { id: true } }),
  ]);

  if (!profile) redirect("/employer/profile/new");
  if (!firstCompany) redirect("/employer/company/new");

  return <>{children}</>;
}
