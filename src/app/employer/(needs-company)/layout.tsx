import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db";
import { employerProfile, company } from "@/db/schema";

export default async function EmployerOnboardedLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  const userId = session!.user!.id!;

  const [profile, firstCompany] = await Promise.all([
    db.query.employerProfile.findFirst({
      where: eq(employerProfile.userId, userId),
      columns: { id: true },
    }),
    db.query.company.findFirst({
      where: eq(company.ownerId, userId),
      columns: { id: true },
    }),
  ]);

  if (!profile) redirect("/employer/profile/new");
  if (!firstCompany) redirect("/employer/company/new");

  return <>{children}</>;
}
