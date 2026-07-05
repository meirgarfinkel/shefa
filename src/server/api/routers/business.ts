import { z } from "zod";
import { eq, and, ne, count, asc, inArray } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure, publicProcedure } from "@/server/api/trpc";
import { CreateBusinessSchema, UpdateBusinessSchema } from "@/lib/schemas/employer";
import { business, jobPosting } from "@/db/schema";

export const businessRouter = createTRPCRouter({
  getPublic: publicProcedure.input(z.object({ id: z.string() })).query(async ({ ctx, input }) => {
    const co = await ctx.db.query.business.findFirst({
      where: eq(business.id, input.id),
      columns: {
        id: true,
        name: true,
        city: true,
        state: true,
        industry: true,
        website: true,
        aboutBusiness: true,
        missionText: true,
      },
      with: {
        owner: {
          columns: { id: true },
          with: {
            employerProfile: {
              columns: { isResponsive: true, responsivenessUpdatedAt: true, status: true },
            },
          },
        },
      },
    });
    if (!co) throw new TRPCError({ code: "NOT_FOUND" });
    // Hide businesses owned by suspended employers from public view (moderation).
    if (co.owner.employerProfile?.status === "SUSPENDED") {
      throw new TRPCError({ code: "NOT_FOUND" });
    }

    const [activeJobsRow] = await ctx.db
      .select({ count: count() })
      .from(jobPosting)
      .where(and(eq(jobPosting.businessId, input.id), eq(jobPosting.status, "ACTIVE")));

    return {
      id: co.id,
      businessName: co.name,
      city: co.city,
      state: co.state,
      industry: co.industry,
      website: co.website,
      aboutBusiness: co.aboutBusiness,
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

    const businesses = await ctx.db.query.business.findMany({
      where: eq(business.ownerId, ctx.user.id),
      orderBy: asc(business.name),
      columns: { id: true, name: true, country: true, city: true, state: true },
    });

    if (businesses.length === 0) return [];

    const businessIds = businesses.map((c) => c.id);
    const countRows = await ctx.db
      .select({ businessId: jobPosting.businessId, count: count() })
      .from(jobPosting)
      .where(and(eq(jobPosting.status, "ACTIVE"), inArray(jobPosting.businessId, businessIds)))
      .groupBy(jobPosting.businessId);

    const countMap = new Map(countRows.map((r) => [r.businessId, r.count]));

    return businesses.map((c) => ({
      id: c.id,
      businessName: c.name,
      country: c.country,
      city: c.city,
      state: c.state,
      activeJobsCount: countMap.get(c.id) ?? 0,
    }));
  }),

  getById: protectedProcedure.input(z.object({ id: z.string() })).query(async ({ ctx, input }) => {
    if (ctx.user.role !== "EMPLOYER") throw new TRPCError({ code: "FORBIDDEN" });
    const co = await ctx.db.query.business.findFirst({ where: eq(business.id, input.id) });
    if (!co) throw new TRPCError({ code: "NOT_FOUND" });
    if (co.ownerId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN" });
    return co;
  }),

  create: protectedProcedure.input(CreateBusinessSchema).mutation(async ({ ctx, input }) => {
    if (ctx.user.role !== "EMPLOYER") throw new TRPCError({ code: "FORBIDDEN" });
    const [created] = await ctx.db
      .insert(business)
      .values({ ...input, ownerId: ctx.user.id })
      .returning();
    return created!;
  }),

  update: protectedProcedure.input(UpdateBusinessSchema).mutation(async ({ ctx, input }) => {
    if (ctx.user.role !== "EMPLOYER") throw new TRPCError({ code: "FORBIDDEN" });
    const { id, ...data } = input;
    const co = await ctx.db.query.business.findFirst({
      where: eq(business.id, id),
      columns: { ownerId: true },
    });
    if (!co) throw new TRPCError({ code: "NOT_FOUND" });
    if (co.ownerId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN" });
    const [updated] = await ctx.db
      .update(business)
      .set(data)
      .where(eq(business.id, id))
      .returning();
    return updated!;
  }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "EMPLOYER") throw new TRPCError({ code: "FORBIDDEN" });
      const co = await ctx.db.query.business.findFirst({
        where: eq(business.id, input.id),
        columns: { ownerId: true },
      });
      if (!co) throw new TRPCError({ code: "NOT_FOUND" });
      if (co.ownerId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN" });

      const [nonClosedRow] = await ctx.db
        .select({ count: count() })
        .from(jobPosting)
        .where(and(eq(jobPosting.businessId, input.id), ne(jobPosting.status, "CLOSED")));

      if ((nonClosedRow?.count ?? 0) > 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Close all active job postings before deleting this business",
        });
      }

      const [deleted] = await ctx.db.delete(business).where(eq(business.id, input.id)).returning();
      return deleted!;
    }),
});
