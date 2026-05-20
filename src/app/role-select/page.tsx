import { auth } from "@/auth";
import { redirect } from "next/navigation";
import RoleSelectClient from "./_client";

export default async function RoleSelectPage() {
  const session = await auth();
  if (!session) redirect("/sign-in");
  if (session.user.role === "EMPLOYER") redirect("/employer/dashboard");
  if (session.user.role === "SEEKER") redirect("/jobs");
  return <RoleSelectClient />;
}
