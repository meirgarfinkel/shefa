import type { Metadata } from "next";
import { redirectSeekerWithoutProfile } from "@/server/onboarding";

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function MessagesLayout({ children }: { children: React.ReactNode }) {
  await redirectSeekerWithoutProfile();
  return <>{children}</>;
}
