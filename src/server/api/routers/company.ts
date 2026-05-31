import { z } from "zod";
import { eq, and, ne, count, asc, inArray } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure, publicProcedure } from "@/server/api/trpc";
import { CreateCompanySchema, UpdateCompanySchema } from "@/lib/schemas/employer";
import { company, jobPosting } from "@/db/schema";

export const companyRouter = createTRPCRouter({
  getPublic: publicProcedure.input(z.object({ id: z.string() })).query(async ({ ctx, input }) => {
    const co = await ctx.db.query.company.findFirst({
      where: eq(company.id, input.id),
      columns: {
        id: true,
        name: true,
        city: true,
        state: true,
        industry: true,
        website: true,
        aboutCompany: true,
        missionText: true,
      },
      with: {
        owner: {
          columns: { id: true },
          with: {
            employerProfile: {
              columns: { isResponsive: true, responsivenessUpdatedAt: true },
            },
          },
        },
      },
    });
    if (!co) throw new TRPCError({ code: "NOT_FOUND" });

    const [activeJobsRow] = await ctx.db
      .select({ count: count() })
      .from(jobPosting)
      .where(and(eq(jobPosting.companyId, input.id), eq(jobPosting.status, "ACTIVE")));

    return {
      id: co.id,
      companyName: co.name,
      city: co.city,
      state: co.state,
      industry: co.industry,
      website: co.website,
      aboutCompany: co.aboutCompany,
      missionText: co.missionText,
      employer: {
        isResponsive: co.owner.employerProfile?.isResponsive ?? false,
        isNew:
          !co.owner.employerProfile || co.owner.employerProfile.responsivenessUpdatedAt === null,
      },
      _count: { jobs: activeJobsRow?.count ?? 0 },
    };
  }),

  listMine: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.user.role !== "EMPLOYER") throw new TRPCError({ code: "FORBIDDEN" });

    const companies = await ctx.db.query.company.findMany({
      where: eq(company.ownerId, ctx.user.id),
      orderBy: asc(company.name),
      columns: { id: true, name: true, city: true, state: true },
    });

    if (companies.length === 0) return [];

    const companyIds = companies.map((c) => c.id);
    const countRows = await ctx.db
      .select({ companyId: jobPosting.companyId, count: count() })
      .from(jobPosting)
      .where(and(eq(jobPosting.status, "ACTIVE"), inArray(jobPosting.companyId, companyIds)))
      .groupBy(jobPosting.companyId);

    const countMap = new Map(countRows.map((r) => [r.companyId, r.count]));

    return companies.map((c) => ({
      id: c.id,
      companyName: c.name,
      city: c.city,
      state: c.state,
      activeJobsCount: countMap.get(c.id) ?? 0,
    }));
  }),

  getById: protectedProcedure.input(z.object({ id: z.string() })).query(async ({ ctx, input }) => {
    if (ctx.user.role !== "EMPLOYER") throw new TRPCError({ code: "FORBIDDEN" });
    const co = await ctx.db.query.company.findFirst({ where: eq(company.id, input.id) });
    if (!co) throw new TRPCError({ code: "NOT_FOUND" });
    if (co.ownerId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN" });
    return co;
  }),

  create: protectedProcedure.input(CreateCompanySchema).mutation(async ({ ctx, input }) => {
    if (ctx.user.role !== "EMPLOYER") throw new TRPCError({ code: "FORBIDDEN" });
    const [created] = await ctx.db
      .insert(company)
      .values({ ...input, ownerId: ctx.user.id })
      .returning();
    return created!;
  }),

  update: protectedProcedure.input(UpdateCompanySchema).mutation(async ({ ctx, input }) => {
    if (ctx.user.role !== "EMPLOYER") throw new TRPCError({ code: "FORBIDDEN" });
    const { id, ...data } = input;
    const co = await ctx.db.query.company.findFirst({
      where: eq(company.id, id),
      columns: { ownerId: true },
    });
    if (!co) throw new TRPCError({ code: "NOT_FOUND" });
    if (co.ownerId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN" });
    const [updated] = await ctx.db.update(company).set(data).where(eq(company.id, id)).returning();
    return updated!;
  }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "EMPLOYER") throw new TRPCError({ code: "FORBIDDEN" });
      const co = await ctx.db.query.company.findFirst({
        where: eq(company.id, input.id),
        columns: { ownerId: true },
      });
      if (!co) throw new TRPCError({ code: "NOT_FOUND" });
      if (co.ownerId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN" });

      const [nonClosedRow] = await ctx.db
        .select({ count: count() })
        .from(jobPosting)
        .where(and(eq(jobPosting.companyId, input.id), ne(jobPosting.status, "CLOSED")));

      if ((nonClosedRow?.count ?? 0) > 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Close all active job postings before deleting this company",
        });
      }

      const [deleted] = await ctx.db.delete(company).where(eq(company.id, input.id)).returning();
      return deleted!;
    }),
});
