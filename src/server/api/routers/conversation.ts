import { z } from "zod";
import { eq, and, gte, isNull, ne, count, inArray, desc } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { conversation, message, seekerProfile, jobPosting, application } from "@/db/schema";
import { assertActorActive } from "@/server/api/guards";
import { COLD_DMS_PER_DAY, rateLimitWindowStart } from "@/lib/constants/rate-limits";

const ConversationIdInput = z.object({ conversationId: z.string().min(1) });

const participantWith = {
  columns: {
    id: true,
  },
  with: {
    seekerProfile: { columns: { id: true, firstName: true, lastName: true, status: true } },
    employerProfile: { columns: { status: true } },
    businesses: {
      limit: 1,
      columns: { id: true, name: true },
    },
  },
} as const;

export const conversationRouter = createTRPCRouter({
  create: protectedProcedure
    .input(
      z.object({
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

      // Suspended actors cannot start conversations.
      await assertActorActive(ctx.db, callerId, role);

      if (role === "SEEKER") {
        if (!jobId) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Seekers must provide a jobId to start a conversation",
          });
        }

        const job = await ctx.db.query.jobPosting.findFirst({
          where: eq(jobPosting.id, jobId),
          columns: { id: true, employerId: true },
        });
        if (!job) throw new TRPCError({ code: "NOT_FOUND", message: "Job not found" });
        if (job.employerId !== targetId) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Job does not belong to that employer",
          });
        }

        const app = await ctx.db.query.application.findFirst({
          where: and(eq(application.seekerId, callerId), eq(application.jobId, jobId)),
          columns: { id: true },
        });
        if (!app) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You must apply to this job before messaging the employer",
          });
        }

        seekerId = callerId;
        employerId = targetId;
      } else {
        const profile = await ctx.db.query.seekerProfile.findFirst({
          where: eq(seekerProfile.id, targetId),
          columns: { userId: true, status: true },
        });
        if (!profile) throw new TRPCError({ code: "NOT_FOUND", message: "Seeker not found" });
        if (profile.status !== "ACTIVE") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Seeker profile is not active" });
        }

        if (jobId) {
          const job = await ctx.db.query.jobPosting.findFirst({
            where: eq(jobPosting.id, jobId),
            columns: { employerId: true },
          });
          if (!job || job.employerId !== callerId) {
            throw new TRPCError({ code: "FORBIDDEN", message: "Job does not belong to you" });
          }
          // A job-linked conversation requires the seeker to have applied to that job.
          // (Cold outreach must go through the no-jobId path, which is rate limited.)
          const app = await ctx.db.query.application.findFirst({
            where: and(eq(application.seekerId, profile.userId), eq(application.jobId, jobId)),
            columns: { id: true },
          });
          if (!app) {
            throw new TRPCError({
              code: "FORBIDDEN",
              message: "This seeker has not applied to that job",
            });
          }
        }

        seekerId = profile.userId;
        employerId = callerId;
      }

      if (seekerId === employerId) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Cannot message yourself" });
      }

      const existing = await ctx.db.query.conversation.findFirst({
        where: and(
          eq(conversation.seekerId, seekerId),
          eq(conversation.employerId, employerId),
          jobId ? eq(conversation.jobId, jobId) : isNull(conversation.jobId),
        ),
      });
      if (existing) return existing;

      // Cold-DM rate limit: only employer-initiated, no-job-context threads count.
      // Idempotent re-opens above don't reach here, so they don't consume the quota.
      if (role === "EMPLOYER" && !jobId) {
        const recentColdDms = await ctx.db.$count(
          conversation,
          and(
            eq(conversation.employerId, employerId),
            isNull(conversation.jobId),
            gte(conversation.createdAt, rateLimitWindowStart()),
          ),
        );
        if (recentColdDms >= COLD_DMS_PER_DAY) {
          throw new TRPCError({
            code: "TOO_MANY_REQUESTS",
            message: `You can start up to ${COLD_DMS_PER_DAY} new conversations per day. Try again later.`,
          });
        }
      }

      try {
        const [created] = await ctx.db
          .insert(conversation)
          .values({ seekerId, employerId, jobId: jobId ?? null })
          .returning();
        return created!;
      } catch (e) {
        // A concurrent create raced us. The unique constraints — composite
        // (seekerId, employerId, jobId) for job threads, partial unique for cold DMs
        // (jobId IS NULL) — guarantee idempotency, so return the row the other request made.
        if (
          typeof e === "object" &&
          e !== null &&
          "code" in e &&
          (e as { code: string }).code === "23505"
        ) {
          const winner = await ctx.db.query.conversation.findFirst({
            where: and(
              eq(conversation.seekerId, seekerId),
              eq(conversation.employerId, employerId),
              jobId ? eq(conversation.jobId, jobId) : isNull(conversation.jobId),
            ),
          });
          if (winner) return winner;
        }
        throw e;
      }
    }),

  list: protectedProcedure.query(async ({ ctx }) => {
    const callerId = ctx.user.id;
    const isSeeker = ctx.user.role === "SEEKER";

    const convs = await ctx.db.query.conversation.findMany({
      where: isSeeker ? eq(conversation.seekerId, callerId) : eq(conversation.employerId, callerId),
      with: {
        seeker: participantWith,
        employer: participantWith,
        job: { columns: { id: true, title: true } },
      },
      orderBy: desc(conversation.lastMessageAt),
    });

    if (convs.length === 0) return [];

    const convIds = convs.map((c) => c.id);
    const unreadRows = await ctx.db
      .select({ conversationId: message.conversationId, count: count() })
      .from(message)
      .where(
        and(
          inArray(message.conversationId, convIds),
          ne(message.senderId, callerId),
          isNull(message.readAt),
        ),
      )
      .groupBy(message.conversationId);

    const unreadMap = new Map(unreadRows.map((r) => [r.conversationId, r.count]));

    return convs.map((c) => ({
      ...c,
      _count: { messages: unreadMap.get(c.id) ?? 0 },
    }));
  }),

  get: protectedProcedure.input(ConversationIdInput).query(async ({ ctx, input }) => {
    const callerId = ctx.user.id;
    const isSeeker = ctx.user.role === "SEEKER";

    const conv = await ctx.db.query.conversation.findFirst({
      where: and(
        eq(conversation.id, input.conversationId),
        isSeeker ? eq(conversation.seekerId, callerId) : eq(conversation.employerId, callerId),
      ),
      with: {
        messages: { orderBy: (t, ops) => [ops.asc(t.createdAt)] },
        seeker: participantWith,
        employer: participantWith,
        job: {
          columns: {
            id: true,
            title: true,
            status: true,
            country: true,
            city: true,
            state: true,
            jobType: true,
            workArrangement: true,
            workAuthRequired: true,
            minHourlyRate: true,
            payNotes: true,
            workDays: true,
            scheduleNotes: true,
            description: true,
            whatWereLookingFor: true,
          },
          with: {
            business: {
              columns: { id: true, name: true },
              with: {
                owner: {
                  columns: { id: true },
                  with: {
                    employerProfile: {
                      columns: { isResponsive: true, responsivenessUpdatedAt: true },
                    },
                  },
                },
              },
            },
            requiredLanguages: {
              with: { language: { columns: { name: true } } },
            },
          },
        },
      },
    });
    if (!conv) throw new TRPCError({ code: "NOT_FOUND" });

    const { job, ...convRest } = conv;
    return {
      ...convRest,
      job: job
        ? (() => {
            const { business: co, ...jobRest } = job;
            return {
              ...jobRest,
              business: {
                id: co.id,
                name: co.name,
                employer: {
                  isResponsive: co.owner.employerProfile?.isResponsive ?? false,
                  isNew:
                    !co.owner.employerProfile ||
                    co.owner.employerProfile.responsivenessUpdatedAt === null,
                },
              },
            };
          })()
        : null,
    };
  }),

  markRead: protectedProcedure.input(ConversationIdInput).mutation(async ({ ctx, input }) => {
    const callerId = ctx.user.id;
    const isSeeker = ctx.user.role === "SEEKER";

    const conv = await ctx.db.query.conversation.findFirst({
      where: and(
        eq(conversation.id, input.conversationId),
        isSeeker ? eq(conversation.seekerId, callerId) : eq(conversation.employerId, callerId),
      ),
      columns: { seekerId: true, employerId: true },
    });
    if (!conv) throw new TRPCError({ code: "NOT_FOUND" });

    const otherId = isSeeker ? conv.employerId : conv.seekerId;

    await ctx.db
      .update(message)
      .set({ readAt: new Date() })
      .where(
        and(
          eq(message.conversationId, input.conversationId),
          eq(message.senderId, otherId),
          isNull(message.readAt),
        ),
      );
    return { success: true };
  }),

  block: protectedProcedure.input(ConversationIdInput).mutation(async ({ ctx, input }) => {
    const callerId = ctx.user.id;
    const isSeeker = ctx.user.role === "SEEKER";

    const conv = await ctx.db.query.conversation.findFirst({
      where: and(
        eq(conversation.id, input.conversationId),
        isSeeker ? eq(conversation.seekerId, callerId) : eq(conversation.employerId, callerId),
      ),
      columns: { id: true },
    });
    if (!conv) throw new TRPCError({ code: "NOT_FOUND" });

    await ctx.db
      .update(conversation)
      .set(isSeeker ? { seekerBlocked: true } : { employerBlocked: true })
      .where(eq(conversation.id, input.conversationId));
    return { success: true };
  }),

  unblock: protectedProcedure.input(ConversationIdInput).mutation(async ({ ctx, input }) => {
    const callerId = ctx.user.id;
    const isSeeker = ctx.user.role === "SEEKER";

    const conv = await ctx.db.query.conversation.findFirst({
      where: and(
        eq(conversation.id, input.conversationId),
        isSeeker ? eq(conversation.seekerId, callerId) : eq(conversation.employerId, callerId),
      ),
      columns: { id: true },
    });
    if (!conv) throw new TRPCError({ code: "NOT_FOUND" });

    await ctx.db
      .update(conversation)
      .set(isSeeker ? { seekerBlocked: false } : { employerBlocked: false })
      .where(eq(conversation.id, input.conversationId));
    return { success: true };
  }),
});
