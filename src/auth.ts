import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import Resend from "next-auth/providers/resend";
import { prisma } from "@/lib/prisma";
import { authConfig } from "./auth.config";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  providers: [
    Resend({
      apiKey: process.env.RESEND_API_KEY,
      from: "Shefa <noreply@shefa.jobs>",
      sendVerificationRequest: async ({ identifier: email, url }) => {
        if (process.env.NODE_ENV !== "production") {
          console.log(
            `\n${"─".repeat(60)}\n🔐  MAGIC LINK  →  ${email}\n\n   ${url}\n${"─".repeat(60)}\n`,
          );
          return;
        }
        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: "Shefa <noreply@shefa.jobs>",
            to: [email],
            subject: "Sign in to Shefa",
            html: `<p>Sign in to <strong>Shefa</strong>.</p><p><a href="${url}">Click here to sign in</a></p><p>This link expires in 24 hours. If you didn't request this, ignore this email.</p>`,
            text: `Sign in to Shefa\n\n${url}\n\nThis link expires in 24 hours.`,
          }),
        });
        if (!res.ok) {
          throw new Error(`Resend API error ${res.status}: ${await res.text()}`);
        }
      },
    }),
  ],
});
