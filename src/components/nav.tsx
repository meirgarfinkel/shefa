import { auth } from "@/auth";
import Link from "next/link";
import { NavLinks, type NavLink } from "./nav-links";
import { UserMenu } from "./user-menu";

function linksForRole(role: string): NavLink[] {
  if (role === "SEEKER") {
    return [
      { href: "/jobs", label: "Browse Jobs" },
      { href: "/seeker/applications", label: "My Applications" },
      { href: "/messages", label: "Messages" },
      { href: "/seeker/profile/edit", label: "Profile" },
    ];
  }
  if (role === "EMPLOYER") {
    return [
      { href: "/employer/dashboard", label: "Dashboard" },
      { href: "/jobs", label: "Browse Jobs" },
      { href: "/employer/jobs", label: "My Jobs" },
      { href: "/messages", label: "Messages" },
      { href: "/employer/profile/edit", label: "Profile" },
    ];
  }
  if (role === "ADMIN") {
    return [{ href: "/jobs", label: "Browse Jobs" }];
  }
  return [];
}

export async function Nav() {
  const session = await auth();

  const links = session?.user?.role ? linksForRole(session.user.role) : [];
  const email = session?.user?.email ?? null;

  return (
    <>
      <header className="bg-background fixed top-0 right-0 left-0 z-50 h-16 border-b">
        <div className="mx-auto flex h-full max-w-5xl items-center justify-between px-4">
          <Link href="/" className="text-xl font-medium tracking-tight">
            Shefa
          </Link>

          <div className="flex items-center gap-4">
            {links.length > 0 && <NavLinks links={links} />}
            {email ? (
              <UserMenu email={email} />
            ) : (
              <Link
                href="/sign-in"
                className="text-muted-foreground hover:text-foreground text-sm transition-colors duration-150"
              >
                Sign in
              </Link>
            )}
          </div>
        </div>
      </header>
      {/* Spacer so page content clears the fixed header */}
      <div className="h-16" aria-hidden />
    </>
  );
}
