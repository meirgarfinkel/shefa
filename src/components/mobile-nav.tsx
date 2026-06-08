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
          <div
            className="bg-gray-dark-1/60 absolute inset-0 backdrop-blur-xs"
            onClick={() => setOpen(false)}
          />

          {/* Drawer */}
          <div className="bg-gray-dark-1/60 absolute top-0 right-0 flex h-full w-65 flex-col backdrop-blur-md">
            {/* Header */}
            <div className="border-primary flex h-16 items-center justify-end border-b pr-8">
              <button
                onClick={() => setOpen(false)}
                className="text-muted-foreground hover:text-popover-foreground transition-colors"
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
                    className={`rounded-md px-3 py-2 text-sm transition-colors duration-100 ${
                      isActive
                        ? "bg-text-muted text-popover-foreground font-medium"
                        : "text-popover-foreground hover:bg-text-muted hover:text-popover-foreground"
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
                    <p className="text-muted-foreground truncate text-xs">{email}</p>
                    <Link
                      href="/privacy"
                      onClick={() => setOpen(false)}
                      className="text-muted-foreground hover:bg-text-muted hover:text-popover-foreground block rounded-md px-3 py-2 text-sm transition-colors"
                    >
                      Privacy Policy
                    </Link>
                    <Link
                      href="/terms"
                      onClick={() => setOpen(false)}
                      className="text-muted-foreground hover:bg-text-muted hover:text-popover-foreground block rounded-md px-3 py-2 text-sm transition-colors"
                    >
                      Terms of Service
                    </Link>
                    <button
                      className="text-muted-foreground hover:bg-text-muted hover:text-popover-foreground w-full rounded-md px-3 py-2 text-left text-sm transition-colors"
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
                    className="text-muted-foreground hover:bg-text-muted hover:text-popover-foreground block rounded-md px-3 py-2 text-sm transition-colors"
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
