import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";

const ConversationIdInput = z.object({ conversationId: z.string().min(1) });

export const conversationRouter = createTRPCRouter({
  create: protectedProcedure
    .input(
      z.object({
        targetProfileId: z.string().min(1),
        jobId: z.string().min(1).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { targetProfileId, jobId } = input;
      const callerId = ctx.user.id;
      const role = ctx.user.role;
      let targetUserId: string;

      if (role === "SEEKER") {
        if (!jobId) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Seekers must provide a jobId to start a conversation",
          });
        }

        const employerProfile = await ctx.prisma.employerProfile.findUnique({
          where: { id: targetProfileId },
          select: { userId: true },
        });
        if (!employerProfile)
          throw new TRPCError({ code: "NOT_FOUND", message: "Employer not found" });
        targetUserId = employerProfile.userId;

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
        const seekerProfile = await ctx.prisma.seekerProfile.findUnique({
          where: { id: targetProfileId },
          select: { userId: true, status: true },
        });
        if (!seekerProfile) throw new TRPCError({ code: "NOT_FOUND", message: "Seeker not found" });
        if (seekerProfile.status !== "ACTIVE") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Seeker profile is not active" });
        }
        targetUserId = seekerProfile.userId;

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

      if (callerId === targetUserId) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Cannot message yourself" });
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
    const callerId = ctx.user.id;
    return ctx.prisma.conversation.findMany({
      where: {
        OR: [{ participantAId: callerId }, { participantBId: callerId }],
      },
      include: {
        participantA: {
          select: {
            id: true,
            seekerProfile: { select: { id: true, firstName: true, lastName: true } },
            employerProfile: { select: { id: true, companyName: true } },
          },
        },
        participantB: {
          select: {
            id: true,
            seekerProfile: { select: { id: true, firstName: true, lastName: true } },
            employerProfile: { select: { id: true, companyName: true } },
          },
        },
        job: { select: { id: true, title: true } },
        _count: {
          select: {
            messages: { where: { senderId: { not: callerId }, readAt: null } },
          },
        },
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
        participantA: {
          select: {
            id: true,
            seekerProfile: { select: { id: true, firstName: true, lastName: true } },
            employerProfile: { select: { id: true, companyName: true } },
          },
        },
        participantB: {
          select: {
            id: true,
            seekerProfile: { select: { id: true, firstName: true, lastName: true } },
            employerProfile: { select: { id: true, companyName: true } },
          },
        },
        job: { select: { id: true, title: true } },
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
