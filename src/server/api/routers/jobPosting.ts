import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure, publicProcedure } from "@/server/api/trpc";
import {
  CreateJobPostingSchema,
  UpdateJobPostingSchema,
  ListJobPostingsSchema,
} from "@/lib/schemas/jobPosting";

export const jobPostingRouter = createTRPCRouter({
  create: protectedProcedure.input(CreateJobPostingSchema).mutation(async ({ ctx, input }) => {
    if (ctx.user.role !== "EMPLOYER") {
      throw new TRPCError({ code: "FORBIDDEN" });
    }

    const profile = await ctx.prisma.employerProfile.findUnique({
      where: { userId: ctx.user.id },
      select: { id: true },
    });
    if (!profile) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Employer profile not found" });
    }

    const { preferredSkillIds, requiredLanguageIds, ...fields } = input;

    return ctx.prisma.jobPosting.create({
      data: {
        ...fields,
        employerProfileId: profile.id,
        postedById: ctx.user.id,
        ...(preferredSkillIds.length && {
          preferredSkills: { create: preferredSkillIds.map((skillId) => ({ skillId })) },
        }),
        ...(requiredLanguageIds.length && {
          requiredLanguages: {
            create: requiredLanguageIds.map((languageId) => ({ languageId })),
          },
        }),
      },
    });
  }),

  list: publicProcedure.input(ListJobPostingsSchema).query(async ({ ctx, input }) => {
    let isOwnerQuery = false;
    if (ctx.session?.user?.role === "EMPLOYER" && input.employerProfileId) {
      const callerProfile = await ctx.prisma.employerProfile.findUnique({
        where: { userId: ctx.session.user.id },
        select: { id: true },
      });
      isOwnerQuery = callerProfile?.id === input.employerProfileId;
    }

    const statusFilter = isOwnerQuery
      ? input.status?.length
        ? { in: input.status }
        : undefined
      : { in: ["ACTIVE" as const] };

    return ctx.prisma.jobPosting.findMany({
      where: {
        ...(input.employerProfileId && { employerProfileId: input.employerProfileId }),
        ...(statusFilter !== undefined && { status: statusFilter }),
        ...(input.city && { city: { contains: input.city, mode: "insensitive" } }),
        ...(input.state && { state: { contains: input.state, mode: "insensitive" } }),
        ...(input.jobType?.length && { jobType: { in: input.jobType } }),
        ...(input.workArrangement?.length && { workArrangement: { in: input.workArrangement } }),
        ...(input.workDays?.length && { workDays: { hasSome: input.workDays } }),
        ...(input.skillIds?.length && {
          preferredSkills: { some: { skillId: { in: input.skillIds } } },
        }),
      },
      include: {
        preferredSkills: { include: { skill: true } },
        requiredLanguages: { include: { language: true } },
        employerProfile: {
          select: { companyName: true, city: true, state: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  }),

  getById: publicProcedure.input(z.object({ id: z.string() })).query(async ({ ctx, input }) => {
    const posting = await ctx.prisma.jobPosting.findUnique({
      where: { id: input.id },
      include: {
        preferredSkills: { include: { skill: true } },
        requiredLanguages: { include: { language: true } },
        employerProfile: {
          select: {
            id: true,
            companyName: true,
            city: true,
            state: true,
            industry: true,
            isResponsive: true,
          },
        },
      },
    });

    if (!posting) {
      throw new TRPCError({ code: "NOT_FOUND" });
    }

    if (posting.status === "ACTIVE") {
      return posting;
    }

    // Non-active: only the owning employer may view
    let callerProfileId: string | undefined;
    if (ctx.session?.user?.role === "EMPLOYER") {
      const callerProfile = await ctx.prisma.employerProfile.findUnique({
        where: { userId: ctx.session.user.id },
        select: { id: true },
      });
      callerProfileId = callerProfile?.id;
    }

    if (callerProfileId !== posting.employerProfileId) {
      throw new TRPCError({ code: "NOT_FOUND" });
    }

    return posting;
  }),

  update: protectedProcedure.input(UpdateJobPostingSchema).mutation(async ({ ctx, input }) => {
    if (ctx.user.role !== "EMPLOYER") {
      throw new TRPCError({ code: "FORBIDDEN" });
    }

    const { id, preferredSkillIds, requiredLanguageIds, ...fields } = input;

    const posting = await ctx.prisma.jobPosting.findUnique({
      where: { id },
      select: { id: true, postedById: true, status: true },
    });

    if (!posting) {
      throw new TRPCError({ code: "NOT_FOUND" });
    }

    if (posting.postedById !== ctx.user.id) {
      throw new TRPCError({ code: "FORBIDDEN" });
    }

    if (posting.status === "CLOSED") {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Cannot update a closed posting" });
    }

    return ctx.prisma.jobPosting.update({
      where: { id },
      data: {
        ...fields,
        ...(preferredSkillIds !== undefined && {
          preferredSkills: {
            deleteMany: {},
            create: preferredSkillIds.map((skillId) => ({ skillId })),
          },
        }),
        ...(requiredLanguageIds !== undefined && {
          requiredLanguages: {
            deleteMany: {},
            create: requiredLanguageIds.map((languageId) => ({ languageId })),
          },
        }),
      },
    });
  }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "EMPLOYER") {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      const posting = await ctx.prisma.jobPosting.findUnique({
        where: { id: input.id },
        select: { id: true, postedById: true },
      });

      if (!posting) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      if (posting.postedById !== ctx.user.id) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      return ctx.prisma.jobPosting.update({
        where: { id: input.id },
        data: { status: "CLOSED" },
      });
    }),
});
