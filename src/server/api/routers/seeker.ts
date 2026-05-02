import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure, publicProcedure } from "@/server/api/trpc";
import { CreateSeekerProfileSchema } from "@/lib/schemas/seeker";

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
