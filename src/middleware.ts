import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";
import { NextResponse } from "next/server";
import { routeDecision } from "@/lib/route-guard";

const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const decision = routeDecision(req.nextUrl.pathname, req.auth?.user.role, Boolean(req.auth));
  if (decision.type === "redirect") {
    return NextResponse.redirect(new URL(decision.to, req.url));
  }
  return NextResponse.next();
});

export const config = {
  matcher: [
    "/",
    "/admin/:path*",
    "/employer/:path*",
    "/seeker/:path*",
    "/role-select",
    "/messages/:path*",
  ],
};
