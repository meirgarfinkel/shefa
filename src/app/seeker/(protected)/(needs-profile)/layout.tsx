import { redirectSeekerWithoutProfile } from "@/server/onboarding";

export default async function SeekerOnboardedLayout({ children }: { children: React.ReactNode }) {
  await redirectSeekerWithoutProfile();
  return <>{children}</>;
}
