import { redirectSeekerWithoutProfile } from "@/server/onboarding";

export default async function JobsLayout({ children }: { children: React.ReactNode }) {
  await redirectSeekerWithoutProfile();
  return <>{children}</>;
}
