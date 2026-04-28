import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { CreateSeekerProfileSchema } from "@/lib/schemas/seeker";

export const seekerRouter = createTRPCRouter({
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

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (ctx.prisma.user as any).update({
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
