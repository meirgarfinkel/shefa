import type { Role } from "@/types/role";

/**
 * Pure routing decision for `src/middleware.ts`, extracted so it can be unit-tested without
 * standing up NextAuth. Edge-safe: depends only on the `Role` type.
 *
 * - `/` is the public landing page: unauthenticated visitors (and crawlers) are let through
 *   so the homepage is indexable; authenticated users are sent to their role dashboard.
 * - Every other matched (auth-gated) route redirects unauthenticated requests to `/`.
 */
export type RouteDecision = { type: "next" } | { type: "redirect"; to: string };

export function routeDecision(
  pathname: string,
  role: Role | null | undefined,
  isAuthed: boolean,
): RouteDecision {
  if (pathname === "/") {
    if (!isAuthed) return { type: "next" };
    if (role === "ADMIN") return { type: "redirect", to: "/admin" };
    if (role === "EMPLOYER") return { type: "redirect", to: "/employer/dashboard" };
    if (role === "SEEKER") return { type: "redirect", to: "/jobs" };
    return { type: "redirect", to: "/role-select" };
  }
  if (!isAuthed) return { type: "redirect", to: "/" };
  return { type: "next" };
}
