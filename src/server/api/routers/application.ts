import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import {
  ApplySchema,
  ListForJobSchema,
  UpdateApplicationStatusSchema,
} from "@/lib/schemas/application";
import { scheduleApplicationNotify } from "@/server/jobs/schedule-application-notify";

export const applicationRouter = createTRPCRouter({
  submit: protectedProcedure.input(ApplySchema).mutation(async ({ ctx, input }) => {
    if (ctx.user.role !== "SEEKER") {
      throw new TRPCError({ code: "FORBIDDEN" });
    }

    const profile = await ctx.prisma.seekerProfile.findUnique({
      where: { userId: ctx.user.id },
      select: { id: true },
    });
    if (!profile) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Seeker profile not found" });
    }

    const job = await ctx.prisma.jobPosting.findUnique({
      where: { id: input.jobId },
      select: { id: true, status: true, postedById: true },
    });
    if (!job) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Job not found" });
    }
    if (job.status !== "ACTIVE") {
      throw new TRPCError({ code: "FORBIDDEN", message: "Job is not accepting applications" });
    }

    let application;
    try {
      application = await ctx.prisma.application.create({
        data: {
          seekerId: ctx.user.id,
          seekerProfileId: profile.id,
          jobId: input.jobId,
          message: input.message,
        },
      });
    } catch (e) {
      if (
        typeof e === "object" &&
        e !== null &&
        "code" in e &&
        (e as { code: string }).code === "P2002"
      ) {
        throw new TRPCError({ code: "CONFLICT", message: "Already applied to this job" });
      }
      throw e;
    }

    // Fire-and-forget — notification failure must not fail the submit
    scheduleApplicationNotify(input.jobId, job.postedById).catch((err: unknown) => {
      console.error("[application.submit] Failed to schedule notification:", err);
    });

    return application;
  }),

  listForSeeker: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.user.role !== "SEEKER") {
      throw new TRPCError({ code: "FORBIDDEN" });
    }

    return ctx.prisma.application.findMany({
      where: { seekerId: ctx.user.id },
      include: {
        job: {
          select: {
            id: true,
            title: true,
            city: true,
            state: true,
            jobType: true,
            status: true,
            employerProfile: { select: { id: true, companyName: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  }),

  listForJob: protectedProcedure.input(ListForJobSchema).query(async ({ ctx, input }) => {
    if (ctx.user.role !== "EMPLOYER") {
      throw new TRPCError({ code: "FORBIDDEN" });
    }

    const job = await ctx.prisma.jobPosting.findUnique({
      where: { id: input.jobId },
      select: { id: true, postedById: true },
    });
    if (!job) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Job not found" });
    }
    if (job.postedById !== ctx.user.id) {
      throw new TRPCError({ code: "FORBIDDEN" });
    }

    return ctx.prisma.application.findMany({
      where: { jobId: input.jobId },
      include: {
        seekerProfile: {
          select: {
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
      orderBy: { createdAt: "desc" },
    });
  }),

  updateStatus: protectedProcedure
    .input(UpdateApplicationStatusSchema)
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "EMPLOYER") {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      const application = await ctx.prisma.application.findUnique({
        where: { id: input.id },
        select: { id: true, job: { select: { postedById: true } } },
      });
      if (!application) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }
      if (application.job.postedById !== ctx.user.id) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      return ctx.prisma.application.update({
        where: { id: input.id },
        data: { status: input.status },
      });
    }),

  myStatus: protectedProcedure
    .input(z.object({ jobId: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      if (ctx.user.role !== "SEEKER") return null;
      return ctx.prisma.application.findUnique({
        where: { seekerId_jobId: { seekerId: ctx.user.id, jobId: input.jobId } },
        select: { id: true, status: true },
      });
    }),
});
