import { auth } from "@/auth";
import { redirect } from "next/navigation";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session) redirect("/sign-in");
  if (!session.user.role) redirect("/role-select");
  if (session.user.role !== "ADMIN") redirect("/");
  return <>{children}</>;
}
