"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import type { NavLink } from "./nav-links";

interface MobileNavProps {
  links: NavLink[];
  email: string | null;
}

export function MobileNav({ links, email }: MobileNavProps) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // close on route change
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // lock body scroll when open
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      {/* Trigger */}
      <div className="md:hidden">
        <Button
          variant="ghost"
          size="icon"
          aria-label={open ? "Close menu" : "Open menu"}
          onClick={() => setOpen((prev) => !prev)}
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
      </div>

      {/* Overlay */}
      {open && (
        <div className="fixed inset-0 z-50 md:hidden">
          {/* Backdrop */}
          <div className="bg-surface-3/80 absolute inset-0" onClick={() => setOpen(false)} />

          {/* Drawer */}
          <div className="bg-surface-1 absolute top-0 right-0 flex h-full w-65 flex-col">
            {/* Header */}
            <div className="border-primary flex h-16 items-center justify-between border-b px-4">
              <span className="font-medium">Shefa</span>
              <button
                onClick={() => setOpen(false)}
                className="text-text-muted hover:text-text transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Nav */}
            <nav className="flex flex-col gap-1 p-3">
              {links.map((link) => {
                const isActive = pathname === link.href || pathname.startsWith(link.href + "/");

                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setOpen(false)}
                    className={`rounded-md px-3 py-2 text-sm transition-colors duration-150 ${
                      isActive
                        ? "bg-text-muted text-text font-medium"
                        : "text-text hover:bg-text-muted hover:text-text"
                    }`}
                  >
                    {link.label}
                  </Link>
                );
              })}
            </nav>

            {/* Footer */}
            {(links.length > 0 || email) && (
              <div className="border-primary mt-auto space-y-2 border-t p-3">
                {email ? (
                  <>
                    <p className="text-text-muted truncate text-xs">{email}</p>
                    <button
                      className="text-text-muted hover:bg-text-muted hover:text-text w-full rounded-md px-3 py-2 text-left text-sm transition-colors"
                      onClick={() => {
                        setOpen(false);
                        void signOut({ callbackUrl: "/sign-in" });
                      }}
                    >
                      Sign out
                    </button>
                  </>
                ) : (
                  <Link
                    href="/sign-in"
                    onClick={() => setOpen(false)}
                    className="text-text-muted hover:bg-text-muted hover:text-text block rounded-md px-3 py-2 text-sm transition-colors"
                  >
                    Sign in
                  </Link>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
