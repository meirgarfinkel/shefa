// Edge runtime — never import db, auth.ts, @prisma/client, or generated Prisma client here
import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";
import { NextResponse } from "next/server";

const { auth } = NextAuth(authConfig);

const PUBLIC_PATHS = ["/sign-in", "/verify-request", "/api/auth"];
const ROLE_SELECT_PATH = "/role-select";
const SEEKER_PROFILE_PATH = "/seeker/profile/new";
const EMPLOYER_PROFILE_PATH = "/employer/profile/new";

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p));

  if (!req.auth && !isPublic && !pathname.startsWith("/api/")) {
    const signIn = new URL("/sign-in", req.url);
    signIn.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(signIn);
  }

  if (
    req.auth &&
    !req.auth.user.role &&
    pathname !== ROLE_SELECT_PATH &&
    !pathname.startsWith("/api/")
  ) {
    return NextResponse.redirect(new URL(ROLE_SELECT_PATH, req.url));
  }

  const role = req.auth?.user.role;
  if (!pathname.startsWith("/api/")) {
    if (pathname === SEEKER_PROFILE_PATH && role !== "SEEKER") {
      return NextResponse.redirect(new URL("/", req.url));
    }
    if (pathname === EMPLOYER_PROFILE_PATH && role !== "EMPLOYER") {
      return NextResponse.redirect(new URL("/", req.url));
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
