import { auth } from "@/auth";
import { redirect } from "next/navigation";
import SignInForm from "./_sign-in-form";

export default async function SignInPage() {
  const session = await auth();
  if (session?.user?.role === "EMPLOYER") redirect("/employer/dashboard");
  if (session?.user?.role === "SEEKER") redirect("/jobs");
  if (session?.user && !session.user.role) redirect("/role-select");
  return <SignInForm />;
}
