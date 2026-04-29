import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";

const ConversationIdInput = z.object({ conversationId: z.string().min(1) });

export const conversationRouter = createTRPCRouter({
  create: protectedProcedure
    .input(
      z.object({
        targetUserId: z.string().min(1),
        jobId: z.string().min(1).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { targetUserId, jobId } = input;
      const callerId = ctx.user.id;
      const role = ctx.user.role;

      if (callerId === targetUserId) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Cannot message yourself" });
      }

      if (role === "SEEKER") {
        if (!jobId) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Seekers must provide a jobId to start a conversation",
          });
        }

        const job = await ctx.prisma.jobPosting.findUnique({
          where: { id: jobId },
          select: { id: true, postedById: true },
        });
        if (!job) throw new TRPCError({ code: "NOT_FOUND", message: "Job not found" });
        if (job.postedById !== targetUserId) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Job does not belong to that employer",
          });
        }

        const application = await ctx.prisma.application.findFirst({
          where: { seekerId: callerId, jobId },
          select: { id: true },
        });
        if (!application) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You must apply to this job before messaging the employer",
          });
        }
      } else {
        // EMPLOYER
        const target = await ctx.prisma.user.findUnique({
          where: { id: targetUserId },
          select: { id: true, role: true, seekerProfile: { select: { id: true, status: true } } },
        });
        if (!target) throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
        if (target.role !== "SEEKER" || !target.seekerProfile) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Target must be an active seeker" });
        }
        if (target.seekerProfile.status !== "ACTIVE") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Seeker profile is not active" });
        }

        if (jobId) {
          const job = await ctx.prisma.jobPosting.findUnique({
            where: { id: jobId },
            select: { postedById: true },
          });
          if (!job || job.postedById !== callerId) {
            throw new TRPCError({ code: "FORBIDDEN", message: "Job does not belong to you" });
          }
        }
      }

      const existing = await ctx.prisma.conversation.findFirst({
        where: {
          OR: [
            { participantAId: callerId, participantBId: targetUserId },
            { participantAId: targetUserId, participantBId: callerId },
          ],
          jobId: jobId ?? null,
        },
      });
      if (existing) return existing;

      return ctx.prisma.conversation.create({
        data: {
          participantAId: callerId,
          participantBId: targetUserId,
          initiatedById: callerId,
          jobId: jobId ?? null,
        },
      });
    }),

  list: protectedProcedure.query(async ({ ctx }) => {
    return ctx.prisma.conversation.findMany({
      where: {
        OR: [{ participantAId: ctx.user.id }, { participantBId: ctx.user.id }],
      },
      include: {
        participantA: { select: { id: true, email: true } },
        participantB: { select: { id: true, email: true } },
      },
      orderBy: [{ lastMessageAt: "desc" }],
    });
  }),

  get: protectedProcedure.input(ConversationIdInput).query(async ({ ctx, input }) => {
    const conv = await ctx.prisma.conversation.findUnique({
      where: {
        id: input.conversationId,
        OR: [{ participantAId: ctx.user.id }, { participantBId: ctx.user.id }],
      },
      include: {
        messages: { orderBy: { createdAt: "asc" } },
      },
    });
    if (!conv) throw new TRPCError({ code: "NOT_FOUND" });
    return conv;
  }),

  markRead: protectedProcedure.input(ConversationIdInput).mutation(async ({ ctx, input }) => {
    const conv = await ctx.prisma.conversation.findUnique({
      where: { id: input.conversationId },
      select: { participantAId: true, participantBId: true },
    });
    if (!conv) throw new TRPCError({ code: "NOT_FOUND" });

    const callerId = ctx.user.id;
    if (conv.participantAId !== callerId && conv.participantBId !== callerId) {
      throw new TRPCError({ code: "FORBIDDEN" });
    }

    // Mark messages sent by the other participant as read
    const otherId = conv.participantAId === callerId ? conv.participantBId : conv.participantAId;

    await ctx.prisma.message.updateMany({
      where: { conversationId: input.conversationId, senderId: otherId, readAt: null },
      data: { readAt: new Date() },
    });
  }),

  block: protectedProcedure.input(ConversationIdInput).mutation(async ({ ctx, input }) => {
    const conv = await ctx.prisma.conversation.findUnique({
      where: { id: input.conversationId },
      select: { participantAId: true, participantBId: true },
    });
    if (!conv) throw new TRPCError({ code: "NOT_FOUND" });

    const callerId = ctx.user.id;
    const isA = conv.participantAId === callerId;
    const isB = conv.participantBId === callerId;
    if (!isA && !isB) throw new TRPCError({ code: "FORBIDDEN" });

    await ctx.prisma.conversation.update({
      where: { id: input.conversationId },
      data: isA ? { aBlockedB: true } : { bBlockedA: true },
    });
  }),

  unblock: protectedProcedure.input(ConversationIdInput).mutation(async ({ ctx, input }) => {
    const conv = await ctx.prisma.conversation.findUnique({
      where: { id: input.conversationId },
      select: { participantAId: true, participantBId: true },
    });
    if (!conv) throw new TRPCError({ code: "NOT_FOUND" });

    const callerId = ctx.user.id;
    const isA = conv.participantAId === callerId;
    const isB = conv.participantBId === callerId;
    if (!isA && !isB) throw new TRPCError({ code: "FORBIDDEN" });

    await ctx.prisma.conversation.update({
      where: { id: input.conversationId },
      data: isA ? { aBlockedB: false } : { bBlockedA: false },
    });
  }),
});
