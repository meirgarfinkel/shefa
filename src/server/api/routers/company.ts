import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure, publicProcedure } from "@/server/api/trpc";
import { CreateCompanySchema, UpdateCompanySchema } from "@/lib/schemas/employer";

export const companyRouter = createTRPCRouter({
  // Public company page
  getPublic: publicProcedure.input(z.object({ id: z.string() })).query(async ({ ctx, input }) => {
    const company = await ctx.prisma.company.findUnique({
      where: { id: input.id },
      select: {
        id: true,
        name: true,
        city: true,
        state: true,
        industry: true,
        website: true,
        aboutCompany: true,
        missionText: true,
        owner: {
          select: {
            employerProfile: {
              select: { isResponsive: true, responsivenessUpdatedAt: true },
            },
          },
        },
        _count: { select: { jobs: { where: { status: "ACTIVE" } } } },
      },
    });
    if (!company) throw new TRPCError({ code: "NOT_FOUND" });
    return {
      id: company.id,
      companyName: company.name,
      city: company.city,
      state: company.state,
      industry: company.industry,
      website: company.website,
      aboutCompany: company.aboutCompany,
      missionText: company.missionText,
      isResponsive: company.owner.employerProfile?.isResponsive ?? false,
      isNew:
        !company.owner.employerProfile ||
        company.owner.employerProfile.responsivenessUpdatedAt === null,
      _count: company._count,
    };
  }),

  // List caller's companies
  listMine: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.user.role !== "EMPLOYER") throw new TRPCError({ code: "FORBIDDEN" });
    const companies = await ctx.prisma.company.findMany({
      where: { ownerId: ctx.user.id },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        city: true,
        state: true,
        _count: { select: { jobs: { where: { status: "ACTIVE" } } } },
      },
    });
    return companies.map((c) => ({
      id: c.id,
      companyName: c.name,
      city: c.city,
      state: c.state,
      activeJobsCount: c._count.jobs,
    }));
  }),

  // Get a specific company by id (for edit page, verifies ownership)
  getById: protectedProcedure.input(z.object({ id: z.string() })).query(async ({ ctx, input }) => {
    if (ctx.user.role !== "EMPLOYER") throw new TRPCError({ code: "FORBIDDEN" });
    const company = await ctx.prisma.company.findUnique({ where: { id: input.id } });
    if (!company) throw new TRPCError({ code: "NOT_FOUND" });
    if (company.ownerId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN" });
    return company;
  }),

  create: protectedProcedure.input(CreateCompanySchema).mutation(async ({ ctx, input }) => {
    if (ctx.user.role !== "EMPLOYER") throw new TRPCError({ code: "FORBIDDEN" });
    return ctx.prisma.company.create({
      data: { ...input, ownerId: ctx.user.id },
    });
  }),

  update: protectedProcedure.input(UpdateCompanySchema).mutation(async ({ ctx, input }) => {
    if (ctx.user.role !== "EMPLOYER") throw new TRPCError({ code: "FORBIDDEN" });
    const { id, ...data } = input;
    const company = await ctx.prisma.company.findUnique({
      where: { id },
      select: { ownerId: true },
    });
    if (!company) throw new TRPCError({ code: "NOT_FOUND" });
    if (company.ownerId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN" });
    return ctx.prisma.company.update({ where: { id }, data });
  }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "EMPLOYER") throw new TRPCError({ code: "FORBIDDEN" });
      const company = await ctx.prisma.company.findUnique({
        where: { id: input.id },
        select: {
          ownerId: true,
          _count: { select: { jobs: { where: { status: { not: "CLOSED" } } } } },
        },
      });
      if (!company) throw new TRPCError({ code: "NOT_FOUND" });
      if (company.ownerId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN" });
      if (company._count.jobs > 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Close all active job postings before deleting this company",
        });
      }
      return ctx.prisma.company.delete({ where: { id: input.id } });
    }),
});
