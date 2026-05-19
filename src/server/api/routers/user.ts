import { randomBytes } from "crypto";
import { z } from "zod";
import { eq, like } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { users, verificationTokens } from "@/db/schema";

export const userRouter = createTRPCRouter({
  setRole: protectedProcedure
    .input(z.object({ role: z.enum(["SEEKER", "EMPLOYER"]) }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.update(users).set({ role: input.role }).where(eq(users.id, ctx.user.id));
    }),

  deleteAccount: protectedProcedure.mutation(async ({ ctx }) => {
    await ctx.db.delete(users).where(eq(users.id, ctx.user.id));
  }),

  requestEmailChange: protectedProcedure
    .input(z.object({ newEmail: z.string().email() }))
    .mutation(async ({ ctx, input }) => {
      const { newEmail } = input;

      const existing = await ctx.db.query.users.findFirst({
        where: eq(users.email, newEmail),
        columns: { id: true },
      });
      if (existing && existing.id !== ctx.user.id) {
        throw new TRPCError({ code: "CONFLICT", message: "That email is already in use" });
      }

      await ctx.db
        .delete(verificationTokens)
        .where(like(verificationTokens.identifier, `email_change:${ctx.user.id}:%`));

      const token = randomBytes(32).toString("hex");
      const expires = new Date(Date.now() + 60 * 60 * 1000);

      await ctx.db.insert(verificationTokens).values({
        identifier: `email_change:${ctx.user.id}:${newEmail}`,
        token,
        expires,
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
