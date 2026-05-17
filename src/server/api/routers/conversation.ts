import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";

const ConversationIdInput = z.object({ conversationId: z.string().min(1) });

// Participant shape returned by list/get: first company name for employers, profile name for seekers
const participantSelect = {
  id: true,
  seekerProfile: { select: { id: true, firstName: true, lastName: true } },
  companies: {
    take: 1,
    orderBy: { name: "asc" as const },
    select: { id: true, name: true },
  },
} as const;

export const conversationRouter = createTRPCRouter({
  create: protectedProcedure
    .input(
      z.object({
        // For seekers: employer's userId. For employers: seekerProfile.id.
        targetId: z.string().min(1),
        jobId: z.string().min(1).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { targetId, jobId } = input;
      const callerId = ctx.user.id;
      const role = ctx.user.role;
      let seekerId: string;
      let employerId: string;

      if (role === "SEEKER") {
        if (!jobId) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Seekers must provide a jobId to start a conversation",
          });
        }

        // Verify the job exists and belongs to the target employer
        const job = await ctx.prisma.jobPosting.findUnique({
          where: { id: jobId },
          select: { id: true, employerId: true },
        });
        if (!job) throw new TRPCError({ code: "NOT_FOUND", message: "Job not found" });
        if (job.employerId !== targetId) {
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

        seekerId = callerId;
        employerId = targetId;
      } else {
        // EMPLOYER — targetId is a seekerProfile.id
        const seekerProfile = await ctx.prisma.seekerProfile.findUnique({
          where: { id: targetId },
          select: { userId: true, status: true },
        });
        if (!seekerProfile) throw new TRPCError({ code: "NOT_FOUND", message: "Seeker not found" });
        if (seekerProfile.status !== "ACTIVE") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Seeker profile is not active" });
        }

        if (jobId) {
          const job = await ctx.prisma.jobPosting.findUnique({
            where: { id: jobId },
            select: { employerId: true },
          });
          if (!job || job.employerId !== callerId) {
            throw new TRPCError({ code: "FORBIDDEN", message: "Job does not belong to you" });
          }
        }

        seekerId = seekerProfile.userId;
        employerId = callerId;
      }

      if (seekerId === employerId) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Cannot message yourself" });
      }

      const existing = await ctx.prisma.conversation.findFirst({
        where: { seekerId, employerId, jobId: jobId ?? null },
      });
      if (existing) return existing;

      return ctx.prisma.conversation.create({
        data: { seekerId, employerId, jobId: jobId ?? null },
      });
    }),

  list: protectedProcedure.query(async ({ ctx }) => {
    const callerId = ctx.user.id;
    const isSeeker = ctx.user.role === "SEEKER";
    const where = isSeeker ? { seekerId: callerId } : { employerId: callerId };

    return ctx.prisma.conversation.findMany({
      where,
      include: {
        seeker: { select: participantSelect },
        employer: { select: participantSelect },
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
    const callerId = ctx.user.id;
    const isSeeker = ctx.user.role === "SEEKER";
    const participantWhere = isSeeker ? { seekerId: callerId } : { employerId: callerId };

    const conv = await ctx.prisma.conversation.findFirst({
      where: { id: input.conversationId, ...participantWhere },
      include: {
        messages: { orderBy: { createdAt: "asc" } },
        seeker: { select: participantSelect },
        employer: { select: participantSelect },
        job: { select: { id: true, title: true } },
      },
    });
    if (!conv) throw new TRPCError({ code: "NOT_FOUND" });
    return conv;
  }),

  markRead: protectedProcedure.input(ConversationIdInput).mutation(async ({ ctx, input }) => {
    const callerId = ctx.user.id;
    const isSeeker = ctx.user.role === "SEEKER";
    const participantWhere = isSeeker ? { seekerId: callerId } : { employerId: callerId };

    const conv = await ctx.prisma.conversation.findFirst({
      where: { id: input.conversationId, ...participantWhere },
      select: { seekerId: true, employerId: true },
    });
    if (!conv) throw new TRPCError({ code: "NOT_FOUND" });

    const otherId = isSeeker ? conv.employerId : conv.seekerId;

    await ctx.prisma.message.updateMany({
      where: { conversationId: input.conversationId, senderId: otherId, readAt: null },
      data: { readAt: new Date() },
    });
  }),

  block: protectedProcedure.input(ConversationIdInput).mutation(async ({ ctx, input }) => {
    const callerId = ctx.user.id;
    const isSeeker = ctx.user.role === "SEEKER";
    const participantWhere = isSeeker ? { seekerId: callerId } : { employerId: callerId };

    const conv = await ctx.prisma.conversation.findFirst({
      where: { id: input.conversationId, ...participantWhere },
      select: { id: true },
    });
    if (!conv) throw new TRPCError({ code: "NOT_FOUND" });

    await ctx.prisma.conversation.update({
      where: { id: input.conversationId },
      data: isSeeker ? { seekerBlocked: true } : { employerBlocked: true },
    });
  }),

  unblock: protectedProcedure.input(ConversationIdInput).mutation(async ({ ctx, input }) => {
    const callerId = ctx.user.id;
    const isSeeker = ctx.user.role === "SEEKER";
    const participantWhere = isSeeker ? { seekerId: callerId } : { employerId: callerId };

    const conv = await ctx.prisma.conversation.findFirst({
      where: { id: input.conversationId, ...participantWhere },
      select: { id: true },
    });
    if (!conv) throw new TRPCError({ code: "NOT_FOUND" });

    await ctx.prisma.conversation.update({
      where: { id: input.conversationId },
      data: isSeeker ? { seekerBlocked: false } : { employerBlocked: false },
    });
  }),
});
