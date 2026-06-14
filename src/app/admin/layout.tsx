import type { Metadata } from "next";
import { auth } from "@/auth";
import { redirect } from "next/navigation";

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session) redirect("/");
  if (!session.user.role) redirect("/role-select");
  if (session.user.role !== "ADMIN") redirect("/");
  return <>{children}</>;
}
