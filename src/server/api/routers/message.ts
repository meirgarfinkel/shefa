import { z } from "zod";
import { eq, asc } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import type { DbClient } from "@/db";
import { runMessageNotifyJob } from "@/server/jobs/message-notify.job";
import { conversation, message, jobPosting, seekerProfile, employerProfile } from "@/db/schema";

const ConversationIdInput = z.object({ conversationId: z.string().min(1) });

async function getConversationForParticipant(db: DbClient, conversationId: string) {
  return db.query.conversation.findFirst({
    where: eq(conversation.id, conversationId),
    columns: {
      seekerId: true,
      employerId: true,
      seekerBlocked: true,
      employerBlocked: true,
      jobId: true,
    },
  });
}

export const messageRouter = createTRPCRouter({
  send: protectedProcedure
    .input(
      z.object({
        conversationId: z.string().min(1),
        body: z.string().min(1).max(5000),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { conversationId, body } = input;
      const callerId = ctx.user.id;

      const conv = await getConversationForParticipant(ctx.db, conversationId);
      if (!conv) throw new TRPCError({ code: "NOT_FOUND" });

      const isSeeker = conv.seekerId === callerId;
      const isEmployer = conv.employerId === callerId;
      if (!isSeeker && !isEmployer) throw new TRPCError({ code: "FORBIDDEN" });

      if (conv.seekerBlocked || conv.employerBlocked) throw new TRPCError({ code: "FORBIDDEN" });

      // Application status does NOT gate messaging: a rejected or closed application
      // still allows the conversation to continue (employer follow-up, reconsideration).
      // Messaging is gated by job status, block flags, and profile suspension only.
      // See PROJECT_SPEC §3 (Messaging).
      const [job, seekerProf, employerProf] = await Promise.all([
        conv.jobId
          ? ctx.db.query.jobPosting.findFirst({
              where: eq(jobPosting.id, conv.jobId),
              columns: { status: true },
            })
          : null,
        ctx.db.query.seekerProfile.findFirst({
          where: eq(seekerProfile.userId, conv.seekerId),
          columns: { status: true },
        }),
        ctx.db.query.employerProfile.findFirst({
          where: eq(employerProfile.userId, conv.employerId),
          columns: { status: true },
        }),
      ]);

      if (job && job.status !== "ACTIVE") {
        throw new TRPCError({ code: "FORBIDDEN", message: "This job is no longer active" });
      }
      if (seekerProf && seekerProf.status !== "ACTIVE") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Seeker profile is not active" });
      }
      if (employerProf && employerProf.status !== "ACTIVE") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Employer profile is not active" });
      }

      const recipientId = isSeeker ? conv.employerId : conv.seekerId;
      const now = new Date();

      const [newMessage] = await ctx.db
        .insert(message)
        .values({ conversationId, senderId: callerId, body })
        .returning();

      await ctx.db
        .update(conversation)
        .set({
          lastMessageAt: now,
          lastMessagePreview: body.slice(0, 100),
        })
        .where(eq(conversation.id, conversationId));

      runMessageNotifyJob({ conversationId, recipientId }).catch((err: unknown) => {
        console.error("[message.send] Failed to send notification:", err);
      });

      return newMessage!;
    }),

  list: protectedProcedure.input(ConversationIdInput).query(async ({ ctx, input }) => {
    const { conversationId } = input;
    const callerId = ctx.user.id;

    const conv = await getConversationForParticipant(ctx.db, conversationId);
    if (!conv) throw new TRPCError({ code: "NOT_FOUND" });

    if (conv.seekerId !== callerId && conv.employerId !== callerId) {
      throw new TRPCError({ code: "FORBIDDEN" });
    }

    return ctx.db.query.message.findMany({
      where: eq(message.conversationId, conversationId),
      orderBy: asc(message.createdAt),
    });
  }),
});
