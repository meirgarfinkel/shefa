import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db";
import { employerProfile, business } from "@/db/schema";

export default async function EmployerOnboardedLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  const userId = session!.user!.id!;

  const [profile, firstBusiness] = await Promise.all([
    db.query.employerProfile.findFirst({
      where: eq(employerProfile.userId, userId),
      columns: { id: true },
    }),
    db.query.business.findFirst({
      where: eq(business.ownerId, userId),
      columns: { id: true },
    }),
  ]);

  if (!profile) redirect("/employer/profile/new");
  if (!firstBusiness) redirect("/employer/business/new");

  return <>{children}</>;
}
