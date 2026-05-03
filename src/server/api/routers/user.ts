import { randomBytes } from "crypto";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";

export const userRouter = createTRPCRouter({
  setRole: protectedProcedure
    .input(z.object({ role: z.enum(["SEEKER", "EMPLOYER"]) }))
    .mutation(async ({ ctx, input }) => {
      await ctx.prisma.user.update({
        where: { id: ctx.user.id },
        data: { role: input.role },
      });
    }),

  requestEmailChange: protectedProcedure
    .input(z.object({ newEmail: z.string().email() }))
    .mutation(async ({ ctx, input }) => {
      const { newEmail } = input;

      const existing = await ctx.prisma.user.findUnique({ where: { email: newEmail } });
      if (existing && existing.id !== ctx.user.id) {
        throw new TRPCError({ code: "CONFLICT", message: "That email is already in use" });
      }

      // Clear any existing email-change tokens for this user
      await ctx.prisma.verificationToken.deleteMany({
        where: { identifier: { startsWith: `email_change:${ctx.user.id}:` } },
      });

      const token = randomBytes(32).toString("hex");
      const expires = new Date(Date.now() + 60 * 60 * 1000);

      await ctx.prisma.verificationToken.create({
        data: {
          identifier: `email_change:${ctx.user.id}:${newEmail}`,
          token,
          expires,
        },
      });

      const siteUrl = process.env.AUTH_URL ?? "http://localhost:3000";
      const confirmUrl = `${siteUrl}/api/change-email?token=${token}`;

      if (process.env.NODE_ENV !== "production") {
        console.log(
          `\n${"─".repeat(60)}\n📧  EMAIL CHANGE  →  ${newEmail}\n\n   ${confirmUrl}\n${"─".repeat(60)}\n`,
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
          to: [newEmail],
          subject: "Confirm your new email address",
          html: `<p>You requested an email change for your Shefa account.</p><p><a href="${confirmUrl}">Confirm new email address</a></p><p>This link expires in 1 hour. If you didn't request this, ignore this email — your address will not change.</p>`,
          text: `Confirm your new Shefa email address:\n\n${confirmUrl}\n\nExpires in 1 hour.`,
        }),
      });

      if (!res.ok) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to send confirmation email",
        });
      }
    }),
});
