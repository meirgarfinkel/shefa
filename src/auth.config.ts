import type { NextAuthConfig } from "next-auth";
import type { Role } from "@/generated/prisma/enums";

export const authConfig = {
  pages: {
    signIn: "/sign-in",
    verifyRequest: "/verify-request",
  },
  callbacks: {
    jwt({ token, user, trigger, session: updatedSession }) {
      if (user) {
        token.id = user.id;
        token.role = user.role ?? null;
      }
      // Called when useSession().update({ role }) is invoked client-side
      if (trigger === "update" && updatedSession?.role !== undefined) {
        token.role = updatedSession.role;
      }
      return token;
    },
    session({ session, token }) {
      session.user.id = (token.id ?? session.user.id) as string;
      session.user.role = (token.role as Role | null | undefined) ?? null;
      return session;
    },
  },
  providers: [],
} satisfies NextAuthConfig;
