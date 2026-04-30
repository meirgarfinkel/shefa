import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure, publicProcedure } from "@/server/api/trpc";
import { CreateEmployerProfileSchema } from "@/lib/schemas/employer";

export const employerRouter = createTRPCRouter({
  getPublicProfile: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const profile = await ctx.prisma.employerProfile.findUnique({
        where: { id: input.id },
        select: {
          id: true,
          companyName: true,
          city: true,
          state: true,
          industry: true,
          website: true,
          aboutCompany: true,
          missionText: true,
          isResponsive: true,
          responsivenessUpdatedAt: true,
          status: true,
          _count: { select: { jobPostings: true } },
        },
      });
      if (!profile) throw new TRPCError({ code: "NOT_FOUND" });
      return {
        id: profile.id,
        companyName: profile.companyName,
        city: profile.city,
        state: profile.state,
        industry: profile.industry,
        website: profile.website,
        aboutCompany: profile.aboutCompany,
        missionText: profile.missionText,
        isResponsive: profile.isResponsive,
        // Never been scored → treat as "new employer" and show New pill, not a negative state
        isNew: profile.responsivenessUpdatedAt === null,
        status: profile.status,
        _count: profile._count,
      };
    }),

  getProfile: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.user.role !== "EMPLOYER") {
      throw new TRPCError({ code: "FORBIDDEN" });
    }
    const profile = await ctx.prisma.employerProfile.findUnique({
      where: { userId: ctx.user.id },
      select: {
        id: true,
        companyName: true,
        city: true,
        state: true,
        _count: {
          select: { jobPostings: { where: { status: "ACTIVE" } } },
        },
      },
    });
    if (!profile) return null;
    return {
      id: profile.id,
      companyName: profile.companyName,
      city: profile.city,
      state: profile.state,
      activeJobsCount: profile._count.jobPostings,
    };
  }),

  createProfile: protectedProcedure
    .input(CreateEmployerProfileSchema)
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "EMPLOYER") {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      const existing = await ctx.prisma.employerProfile.findUnique({
        where: { userId: ctx.user.id },
      });
      if (existing) {
        throw new TRPCError({ code: "CONFLICT", message: "Profile already exists" });
      }

      const { isAdult: _isAdult, ...profileFields } = input;

      await ctx.prisma.user.update({
        where: { id: ctx.user.id },
        data: { isAdult: true },
      });

      return ctx.prisma.employerProfile.create({
        data: {
          ...profileFields,
          userId: ctx.user.id,
        },
      });
    }),
});
