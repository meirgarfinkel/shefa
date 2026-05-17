import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { CreateEmployerProfileSchema, UpdateEmployerProfileSchema } from "@/lib/schemas/employer";

export const employerRouter = createTRPCRouter({
  // Get the caller's own employer profile (returns null if not yet created)
  getProfile: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.user.role !== "EMPLOYER") throw new TRPCError({ code: "FORBIDDEN" });
    return ctx.prisma.employerProfile.findUnique({
      where: { userId: ctx.user.id },
    });
  }),

  createProfile: protectedProcedure
    .input(CreateEmployerProfileSchema)
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "EMPLOYER") throw new TRPCError({ code: "FORBIDDEN" });

      const existing = await ctx.prisma.employerProfile.findUnique({
        where: { userId: ctx.user.id },
        select: { id: true },
      });
      if (existing) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Employer profile already exists",
        });
      }

      const { isAdult: isAdultConfirmed, ...profileFields } = input;

      const dbUser = await ctx.prisma.user.findUnique({
        where: { id: ctx.user.id },
        select: { isAdult: true },
      });

      if (!dbUser?.isAdult) {
        if (!isAdultConfirmed) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "You must be 18 or older to use this platform",
          });
        }
        await ctx.prisma.user.update({
          where: { id: ctx.user.id },
          data: { isAdult: true },
        });
      }

      return ctx.prisma.employerProfile.create({
        data: { ...profileFields, userId: ctx.user.id },
      });
    }),

  updateProfile: protectedProcedure
    .input(UpdateEmployerProfileSchema)
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "EMPLOYER") throw new TRPCError({ code: "FORBIDDEN" });
      const profile = await ctx.prisma.employerProfile.findUnique({
        where: { userId: ctx.user.id },
        select: { id: true },
      });
      if (!profile) throw new TRPCError({ code: "NOT_FOUND" });
      return ctx.prisma.employerProfile.update({
        where: { userId: ctx.user.id },
        data: input,
      });
    }),

  getRecentApplications: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.user.role !== "EMPLOYER") throw new TRPCError({ code: "FORBIDDEN" });
    return ctx.prisma.application.findMany({
      where: { job: { employerId: ctx.user.id } },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: {
        id: true,
        createdAt: true,
        status: true,
        jobId: true,
        job: {
          select: { id: true, title: true, company: { select: { name: true } } },
        },
        seeker: {
          select: {
            seekerProfile: { select: { firstName: true, lastName: true } },
          },
        },
      },
    });
  }),
});
