import { z } from "zod";
import { eq, and, gte, desc } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import {
  ApplySchema,
  ListForJobSchema,
  UpdateApplicationStatusSchema,
} from "@/lib/schemas/application";
import { runApplicationNotifyJob } from "@/server/jobs/application-notify.job";
import { application, seekerProfile, employerProfile, jobPosting } from "@/db/schema";
import { APPLICATIONS_PER_DAY, rateLimitWindowStart } from "@/lib/constants/rate-limits";

export const applicationRouter = createTRPCRouter({
  submit: protectedProcedure.input(ApplySchema).mutation(async ({ ctx, input }) => {
    if (ctx.user.role !== "SEEKER") {
      throw new TRPCError({ code: "FORBIDDEN" });
    }

    const profile = await ctx.db.query.seekerProfile.findFirst({
      where: eq(seekerProfile.userId, ctx.user.id),
      columns: { id: true, status: true },
    });
    if (!profile) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Seeker profile not found" });
    }
    if (profile.status === "SUSPENDED") {
      throw new TRPCError({ code: "FORBIDDEN", message: "Your account is suspended" });
    }

    const job = await ctx.db.query.jobPosting.findFirst({
      where: eq(jobPosting.id, input.jobId),
      columns: { id: true, status: true, employerId: true },
    });
    if (!job) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Job not found" });
    }
    if (job.status !== "ACTIVE") {
      throw new TRPCError({ code: "FORBIDDEN", message: "Job is not accepting applications" });
    }

    // A suspended employer's jobs are not applyable (hidden, like a closed job).
    const jobOwner = await ctx.db.query.employerProfile.findFirst({
      where: eq(employerProfile.userId, job.employerId),
      columns: { status: true },
    });
    if (jobOwner?.status === "SUSPENDED") {
      throw new TRPCError({ code: "NOT_FOUND", message: "Job not found" });
    }

    // Rolling 24h application rate limit.
    const recentCount = await ctx.db.$count(
      application,
      and(
        eq(application.seekerId, ctx.user.id),
        gte(application.createdAt, rateLimitWindowStart()),
      ),
    );
    if (recentCount >= APPLICATIONS_PER_DAY) {
      throw new TRPCError({
        code: "TOO_MANY_REQUESTS",
        message: `You can submit up to ${APPLICATIONS_PER_DAY} applications per day. Try again later.`,
      });
    }

    let newApplication;
    try {
      const [created] = await ctx.db
        .insert(application)
        .values({
          seekerId: ctx.user.id,
          jobId: input.jobId,
          message: input.message,
        })
        .returning();
      newApplication = created!;
    } catch (e) {
      if (
        typeof e === "object" &&
        e !== null &&
        "code" in e &&
        (e as { code: string }).code === "23505"
      ) {
        throw new TRPCError({ code: "CONFLICT", message: "Already applied to this job" });
      }
      throw e;
    }

    runApplicationNotifyJob({ jobId: input.jobId, employerId: job.employerId }).catch(
      (err: unknown) => {
        console.error("[application.submit] Failed to send notification:", err);
      },
    );

    return newApplication;
  }),

  listForSeeker: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.user.role !== "SEEKER") {
      throw new TRPCError({ code: "FORBIDDEN" });
    }

    return ctx.db.query.application.findMany({
      where: eq(application.seekerId, ctx.user.id),
      orderBy: desc(application.createdAt),
      with: {
        job: {
          columns: {
            id: true,
            title: true,
            city: true,
            state: true,
            jobType: true,
            status: true,
            employerId: true,
          },
          with: {
            company: { columns: { id: true, name: true } },
          },
        },
      },
    });
  }),

  listForJob: protectedProcedure.input(ListForJobSchema).query(async ({ ctx, input }) => {
    if (ctx.user.role !== "EMPLOYER") {
      throw new TRPCError({ code: "FORBIDDEN" });
    }

    const job = await ctx.db.query.jobPosting.findFirst({
      where: eq(jobPosting.id, input.jobId),
      columns: { id: true, employerId: true },
    });
    if (!job) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Job not found" });
    }
    if (job.employerId !== ctx.user.id) {
      throw new TRPCError({ code: "FORBIDDEN" });
    }

    return ctx.db.query.application.findMany({
      where: eq(application.jobId, input.jobId),
      orderBy: desc(application.createdAt),
      with: {
        seeker: {
          columns: { id: true },
          with: {
            seekerProfile: {
              columns: {
                id: true,
                firstName: true,
                lastName: true,
                city: true,
                state: true,
                workAuthorization: true,
                availableDays: true,
              },
            },
          },
        },
      },
    });
  }),

  updateStatus: protectedProcedure
    .input(UpdateApplicationStatusSchema)
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "EMPLOYER") {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      const app = await ctx.db.query.application.findFirst({
        where: eq(application.id, input.id),
        columns: { id: true },
        with: {
          job: { columns: { employerId: true } },
        },
      });
      if (!app) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }
      if (app.job.employerId !== ctx.user.id) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      const [updated] = await ctx.db
        .update(application)
        .set({
          status: input.status,
          ...(input.status === "CLOSED" && { closedAt: new Date() }),
        })
        .where(eq(application.id, input.id))
        .returning();
      return updated!;
    }),

  myStatus: protectedProcedure
    .input(z.object({ jobId: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      if (ctx.user.role !== "SEEKER") return null;
      const app = await ctx.db.query.application.findFirst({
        where: and(eq(application.seekerId, ctx.user.id), eq(application.jobId, input.jobId)),
        columns: { id: true, status: true },
      });
      return app ?? null;
    }),
});
