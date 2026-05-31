import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";
import { NextResponse } from "next/server";

const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const { pathname } = req.nextUrl;
  if (!req.auth) {
    const signIn = new URL("/sign-in", req.url);
    return NextResponse.redirect(signIn);
  }
  if (pathname === "/") {
    const role = req.auth.user.role;
    if (role !== "SEEKER") return NextResponse.redirect(new URL("/employer/dashboard", req.url));
    else return NextResponse.redirect(new URL("/jobs", req.url));
  }
  return NextResponse.next();
});

export const config = {
  matcher: ["/", "/employer/:path*", "/seeker/:path*", "/role-select", "/messages/:path*"],
};
