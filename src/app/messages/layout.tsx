import { redirectSeekerWithoutProfile } from "@/server/onboarding";

export default async function MessagesLayout({ children }: { children: React.ReactNode }) {
  await redirectSeekerWithoutProfile();
  return <>{children}</>;
}
