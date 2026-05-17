import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { scheduleMessageNotify } from "@/server/jobs/schedule-message-notify";

const ConversationIdInput = z.object({ conversationId: z.string().min(1) });

async function getConversationForParticipant(
  prisma: Parameters<Parameters<typeof protectedProcedure.query>[0]>[0]["ctx"]["prisma"],
  conversationId: string,
) {
  return prisma.conversation.findUnique({
    where: { id: conversationId },
    select: { seekerId: true, employerId: true, seekerBlocked: true, employerBlocked: true },
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

      const conv = await getConversationForParticipant(ctx.prisma, conversationId);
      if (!conv) throw new TRPCError({ code: "NOT_FOUND" });

      const isSeeker = conv.seekerId === callerId;
      const isEmployer = conv.employerId === callerId;
      if (!isSeeker && !isEmployer) throw new TRPCError({ code: "FORBIDDEN" });

      // Either side's block prevents all messaging
      if (conv.seekerBlocked || conv.employerBlocked) throw new TRPCError({ code: "FORBIDDEN" });

      const recipientId = isSeeker ? conv.employerId : conv.seekerId;

      const now = new Date();
      const message = await ctx.prisma.message.create({
        data: { conversationId, senderId: callerId, body },
      });

      await ctx.prisma.conversation.update({
        where: { id: conversationId },
        data: {
          lastMessageAt: now,
          lastMessagePreview: body.slice(0, 100),
        },
      });

      // Fire-and-forget — notification failure must not fail the send
      scheduleMessageNotify(conversationId, recipientId).catch((err: unknown) => {
        console.error("[message.send] Failed to schedule notification:", err);
      });

      return message;
    }),

  list: protectedProcedure.input(ConversationIdInput).query(async ({ ctx, input }) => {
    const { conversationId } = input;
    const callerId = ctx.user.id;

    const conv = await getConversationForParticipant(ctx.prisma, conversationId);
    if (!conv) throw new TRPCError({ code: "NOT_FOUND" });

    if (conv.seekerId !== callerId && conv.employerId !== callerId) {
      throw new TRPCError({ code: "FORBIDDEN" });
    }

    return ctx.prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: "asc" },
    });
  }),
});
