import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import Resend from "next-auth/providers/resend";
import { prisma } from "@/lib/prisma";
import type { Role } from "@/generated/prisma/enums";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [
    Resend({
      apiKey: process.env.RESEND_API_KEY,
      from: "Shefa <noreply@shefa.jobs>",
    }),
  ],
  callbacks: {
    session({ session, user }) {
      session.user.id = user.id;
      session.user.role = (user as { role: Role | null }).role;
      return session;
    },
  },
  pages: {
    signIn: "/sign-in",
    verifyRequest: "/verify-request",
  },
});
