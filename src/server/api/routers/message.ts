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
    select: { participantAId: true, participantBId: true, aBlockedB: true, bBlockedA: true },
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

      const isA = conv.participantAId === callerId;
      const isB = conv.participantBId === callerId;
      if (!isA && !isB) throw new TRPCError({ code: "FORBIDDEN" });

      // Either side's block prevents all messaging
      if (conv.aBlockedB || conv.bBlockedA) throw new TRPCError({ code: "FORBIDDEN" });

      const recipientId = isA ? conv.participantBId : conv.participantAId;

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

    if (conv.participantAId !== callerId && conv.participantBId !== callerId) {
      throw new TRPCError({ code: "FORBIDDEN" });
    }

    return ctx.prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: "asc" },
    });
  }),
});
