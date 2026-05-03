import { auth } from "@/auth";
import Link from "next/link";
import { NavLinks, type NavLink } from "./nav-links";
import { UserMenu } from "./user-menu";
import { MobileNav } from "./mobile-nav";

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
      <header className="bg-secondary shadow-surface-3/60 fixed top-0 right-0 left-0 z-50 h-16 shadow-sm">
        <div className="mx-auto flex h-full items-center justify-between px-6">
          <Link href="/" className="text-2xl font-medium tracking-tight">
            Shefa
          </Link>

          <div className="flex items-center gap-4">
            {/* Desktop nav — hidden on mobile */}
            <div className="hidden items-center gap-4 md:flex">
              {links.length > 0 && <NavLinks links={links} />}
              {email ? (
                <UserMenu email={email} />
              ) : (
                <Link
                  href="/sign-in"
                  className="text-text-muted hover:text-text text-sm transition-colors duration-150"
                >
                  Sign in
                </Link>
              )}
            </div>

            {/* Mobile hamburger — hidden on desktop */}
            <MobileNav links={links} email={email} />
          </div>
        </div>
      </header>
      {/* Spacer so page content clears the fixed header */}
      <div className="h-16" aria-hidden />
    </>
  );
}
