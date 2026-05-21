import { eq, desc } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { CreateEmployerProfileSchema, UpdateEmployerProfileSchema } from "@/lib/schemas/employer";
import { employerProfile, users, application, jobPosting } from "@/db/schema";

export const employerRouter = createTRPCRouter({
  getProfile: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.user.role !== "EMPLOYER") throw new TRPCError({ code: "FORBIDDEN" });
    const profile = await ctx.db.query.employerProfile.findFirst({
      where: eq(employerProfile.userId, ctx.user.id),
    });
    return profile ?? null;
  }),

  createProfile: protectedProcedure
    .input(CreateEmployerProfileSchema)
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "EMPLOYER") throw new TRPCError({ code: "FORBIDDEN" });

      const existing = await ctx.db.query.employerProfile.findFirst({
        where: eq(employerProfile.userId, ctx.user.id),
        columns: { id: true },
      });
      if (existing) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Employer profile already exists",
        });
      }

      const { isAdult: isAdultConfirmed, ...profileFields } = input;

      const dbUser = await ctx.db.query.users.findFirst({
        where: eq(users.id, ctx.user.id),
        columns: { isAdult: true },
      });

      if (!dbUser?.isAdult) {
        if (!isAdultConfirmed) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "You must be 18 or older to use this platform",
          });
        }
        await ctx.db.update(users).set({ isAdult: true }).where(eq(users.id, ctx.user.id));
      }

      const [created] = await ctx.db
        .insert(employerProfile)
        .values({ ...profileFields, userId: ctx.user.id })
        .returning();
      return created!;
    }),

  updateProfile: protectedProcedure
    .input(UpdateEmployerProfileSchema)
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "EMPLOYER") throw new TRPCError({ code: "FORBIDDEN" });
      const profile = await ctx.db.query.employerProfile.findFirst({
        where: eq(employerProfile.userId, ctx.user.id),
        columns: { id: true },
      });
      if (!profile) throw new TRPCError({ code: "NOT_FOUND" });
      const [updated] = await ctx.db
        .update(employerProfile)
        .set(input)
        .where(eq(employerProfile.userId, ctx.user.id))
        .returning();
      return updated!;
    }),

  getRecentApplications: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.user.role !== "EMPLOYER") throw new TRPCError({ code: "FORBIDDEN" });

    const employerJobIds = ctx.db
      .select({ id: jobPosting.id })
      .from(jobPosting)
      .where(eq(jobPosting.employerId, ctx.user.id));

    return ctx.db.query.application.findMany({
      where: (app, { inArray }) => inArray(app.jobId, employerJobIds),
      orderBy: desc(application.createdAt),
      limit: 20,
      columns: { id: true, createdAt: true, status: true, jobId: true },
      with: {
        job: {
          columns: { id: true, title: true },
          with: {
            company: { columns: { name: true } },
          },
        },
        seeker: {
          columns: { id: true },
          with: {
            seekerProfile: { columns: { firstName: true, lastName: true } },
          },
        },
      },
    });
  }),
});
