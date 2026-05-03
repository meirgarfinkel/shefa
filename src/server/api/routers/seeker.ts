import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure, publicProcedure } from "@/server/api/trpc";
import { CreateSeekerProfileSchema, UpdateSeekerProfileSchema } from "@/lib/schemas/seeker";

export const seekerRouter = createTRPCRouter({
  getPublicProfile: publicProcedure
    .input(z.object({ id: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      const profile = await ctx.prisma.seekerProfile.findUnique({
        where: { id: input.id },
        include: {
          skills: { include: { skill: { select: { name: true } } } },
          languages: { include: { language: { select: { name: true } } } },
        },
      });
      if (!profile) throw new TRPCError({ code: "NOT_FOUND" });

      const {
        responseRate,
        medianResponseHours,
        userId: _userId,
        skills,
        languages,
        ...publicFields
      } = profile;

      return {
        ...publicFields,
        skills: skills.map((s) => s.skill.name),
        languages: languages.map((l) => l.language.name),
        isNew: responseRate === null,
      };
    }),

  getMyProfile: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.user.role !== "SEEKER") {
      throw new TRPCError({ code: "FORBIDDEN" });
    }
    const profile = await ctx.prisma.seekerProfile.findUnique({
      where: { userId: ctx.user.id },
      select: { id: true, city: true, state: true },
    });
    return profile;
  }),

  getMyFullProfile: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.user.role !== "SEEKER") {
      throw new TRPCError({ code: "FORBIDDEN" });
    }
    const profile = await ctx.prisma.seekerProfile.findUnique({
      where: { userId: ctx.user.id },
      include: {
        skills: { select: { skillId: true } },
        languages: { select: { languageId: true } },
      },
    });
    if (!profile) return null;
    const { skills, languages, ...rest } = profile;
    return {
      ...rest,
      skillIds: skills.map((s) => s.skillId),
      languageIds: languages.map((l) => l.languageId),
    };
  }),

  updateProfile: protectedProcedure
    .input(UpdateSeekerProfileSchema)
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "SEEKER") {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      const profile = await ctx.prisma.seekerProfile.findUnique({
        where: { userId: ctx.user.id },
        select: { id: true },
      });
      if (!profile) throw new TRPCError({ code: "NOT_FOUND" });

      const { skillIds, languageIds, ...profileFields } = input;

      return ctx.prisma.seekerProfile.update({
        where: { userId: ctx.user.id },
        data: {
          ...profileFields,
          ...(skillIds !== undefined && {
            skills: {
              deleteMany: {},
              create: skillIds.map((skillId) => ({ skillId })),
            },
          }),
          ...(languageIds !== undefined && {
            languages: {
              deleteMany: {},
              create: languageIds.map((languageId) => ({ languageId })),
            },
          }),
        },
      });
    }),

  createProfile: protectedProcedure
    .input(CreateSeekerProfileSchema)
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "SEEKER") {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      const existing = await ctx.prisma.seekerProfile.findUnique({
        where: { userId: ctx.user.id },
      });
      if (existing) {
        throw new TRPCError({ code: "CONFLICT", message: "Profile already exists" });
      }

      const { skillIds, languageIds, isAdult: _isAdult, ...profileFields } = input;

      await ctx.prisma.user.update({
        where: { id: ctx.user.id },
        data: { isAdult: true },
      });

      return ctx.prisma.seekerProfile.create({
        data: {
          ...profileFields,
          userId: ctx.user.id,
          ...(skillIds?.length && {
            skills: { create: skillIds.map((skillId) => ({ skillId })) },
          }),
          ...(languageIds?.length && {
            languages: { create: languageIds.map((languageId) => ({ languageId })) },
          }),
        },
      });
    }),
});
