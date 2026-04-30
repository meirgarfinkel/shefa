// Edge runtime — never import db, auth.ts, @prisma/client, or generated Prisma client here
import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";
import { NextResponse } from "next/server";

const { auth } = NextAuth(authConfig);

const PUBLIC_PATHS = ["/sign-in", "/verify-request", "/api/auth"];

const ROLE_SELECT_PATH = "/role-select";

const EMPLOYER_ONLY_PREFIXES = ["/employer/dashboard", "/employer/jobs", "/employer/profile"];

const SEEKER_ONLY_PREFIXES = ["/seeker/applications", "/seeker/profile"];

function roleDashboard(role: string | null | undefined): string {
  if (role === "EMPLOYER") return "/employer/dashboard";
  return "/jobs";
}

export default auth((req) => {
  const { pathname } = req.nextUrl;

  if (pathname.startsWith("/api/")) return NextResponse.next();

  const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p));

  if (!req.auth) {
    if (isPublic) return NextResponse.next();
    const signIn = new URL("/sign-in", req.url);
    if (pathname !== "/") signIn.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(signIn);
  }

  const role = req.auth.user.role;

  if (!role && pathname !== ROLE_SELECT_PATH) {
    return NextResponse.redirect(new URL(ROLE_SELECT_PATH, req.url));
  }

  if (role) {
    if (pathname === "/sign-in" || pathname === "/") {
      return NextResponse.redirect(new URL(roleDashboard(role), req.url));
    }

    if (role !== "EMPLOYER" && EMPLOYER_ONLY_PREFIXES.some((p) => pathname.startsWith(p))) {
      return NextResponse.redirect(new URL("/jobs", req.url));
    }

    if (role !== "SEEKER" && SEEKER_ONLY_PREFIXES.some((p) => pathname.startsWith(p))) {
      return NextResponse.redirect(new URL("/jobs", req.url));
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
