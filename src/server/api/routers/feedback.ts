import { eq, and, gte, desc } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure, adminProcedure } from "@/server/api/trpc";
import { SubmitFeedbackSchema, UpdateFeedbackStatusSchema } from "@/lib/schemas/feedback";
import { assertActorActive } from "@/server/api/guards";
import { FEEDBACK_PER_DAY, rateLimitWindowStart } from "@/lib/constants/rate-limits";
import { sendEmail } from "@/server/emails";
import { buildFeedbackNotifyEmail } from "@/server/emails/feedback-notify";
import { getAppUrl } from "@/server/app-url";
import { feedback } from "@/db/schema";

export const feedbackRouter = createTRPCRouter({
  // Any authenticated, non-suspended user may send feedback to admins. Rate-limited
  // by a rolling 24h row count (abuse throttle), then emailed to admins inline.
  submit: protectedProcedure.input(SubmitFeedbackSchema).mutation(async ({ ctx, input }) => {
    await assertActorActive(ctx.db, ctx.user.id, ctx.user.role);

    const recentCount = await ctx.db.$count(
      feedback,
      and(eq(feedback.userId, ctx.user.id), gte(feedback.createdAt, rateLimitWindowStart())),
    );
    if (recentCount >= FEEDBACK_PER_DAY) {
      throw new TRPCError({
        code: "TOO_MANY_REQUESTS",
        message: `You can send up to ${FEEDBACK_PER_DAY} pieces of feedback per day. Try again later.`,
      });
    }

    const [created] = await ctx.db
      .insert(feedback)
      .values({
        userId: ctx.user.id,
        category: input.category,
        message: input.message,
      })
      .returning();

    // Notify admins (fire-and-forget). No-op if ADMIN_EMAIL is unset.
    const adminEmail = process.env.ADMIN_EMAIL;
    if (adminEmail) {
      const email = buildFeedbackNotifyEmail({
        category: input.category,
        message: input.message,
        submitterEmail: ctx.user.email ?? "unknown",
        appUrl: getAppUrl(),
      });
      sendEmail({ to: adminEmail, subject: email.subject, html: email.html }).catch(
        (err: unknown) => {
          console.error("[feedback.submit] Failed to notify admin:", err);
        },
      );
    }

    return created!;
  }),

  // Moderation queue, newest first, with the submitter resolved.
  listAll: adminProcedure.query(async ({ ctx }) => {
    return ctx.db.query.feedback.findMany({
      orderBy: desc(feedback.createdAt),
      limit: 200,
      with: { user: { columns: { id: true, name: true, email: true } } },
    });
  }),

  updateStatus: adminProcedure
    .input(UpdateFeedbackStatusSchema)
    .mutation(async ({ ctx, input }) => {
      const [updated] = await ctx.db
        .update(feedback)
        .set({ status: input.status })
        .where(eq(feedback.id, input.id))
        .returning();
      if (!updated) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Feedback not found" });
      }
      return updated;
    }),
});
