import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { CreateEmployerProfileSchema } from "@/lib/schemas/employer";

export const employerRouter = createTRPCRouter({
  getProfile: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.user.role !== "EMPLOYER") {
      throw new TRPCError({ code: "FORBIDDEN" });
    }
    return ctx.prisma.employerProfile.findUnique({
      where: { userId: ctx.user.id },
      select: { id: true, companyName: true, city: true, state: true },
    });
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
