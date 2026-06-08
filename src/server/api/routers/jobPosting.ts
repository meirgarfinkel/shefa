import { z } from "zod";
import { eq, and, arrayOverlaps, desc, inArray, notInArray, ilike, sql, count } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure, publicProcedure } from "@/server/api/trpc";
import {
  CloseJobSchema,
  CreateJobPostingSchema,
  ListJobPostingsSchema,
  UpdateJobPostingSchema,
} from "@/lib/schemas/jobPosting";
import type { DbClient } from "@/db";
import {
  jobPosting,
  jobLanguage,
  company,
  state,
  city,
  application,
  employerProfile,
} from "@/db/schema";
import { assertActorActive } from "@/server/api/guards";

async function lookupCityCoords(
  db: DbClient,
  cityName: string,
  stateAbbr: string,
): Promise<{ lat: number; lon: number } | null> {
  const [record] = await db
    .select({ lat: city.lat, lon: city.lon })
    .from(city)
    .innerJoin(state, eq(city.stateId, state.id))
    .where(and(sql`lower(${city.name}) = lower(${cityName})`, eq(state.abbr, stateAbbr)))
    .limit(1);
  return record ?? null;
}

export const jobPostingRouter = createTRPCRouter({
  create: protectedProcedure.input(CreateJobPostingSchema).mutation(async ({ ctx, input }) => {
    if (ctx.user.role !== "EMPLOYER") throw new TRPCError({ code: "FORBIDDEN" });

    await assertActorActive(ctx.db, ctx.user.id, ctx.user.role);

    const co = await ctx.db.query.company.findFirst({
      where: eq(company.id, input.companyId),
      columns: { id: true, ownerId: true },
    });
    if (!co || co.ownerId !== ctx.user.id) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Company not found" });
    }

    const { companyId, requiredLanguageIds, ...fields } = input;
    const coords = await lookupCityCoords(ctx.db, fields.city, fields.state);
    if (!coords) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid city/state" });
    }

    const [created] = await ctx.db
      .insert(jobPosting)
      .values({
        ...fields,
        minHourlyRate: String(fields.minHourlyRate),
        employerId: ctx.user.id,
        companyId,
        lat: coords.lat,
        lon: coords.lon,
      })
      .returning();

    if (requiredLanguageIds.length > 0) {
      await ctx.db
        .insert(jobLanguage)
        .values(requiredLanguageIds.map((languageId) => ({ jobId: created!.id, languageId })));
    }

    return created!;
  }),

  list: publicProcedure.input(ListJobPostingsSchema).query(async ({ ctx, input }) => {
    let isOwnerQuery = false;
    if (ctx.session?.user?.role === "EMPLOYER") {
      if (input.myJobs) {
        isOwnerQuery = true;
      } else if (input.companyId) {
        const co = await ctx.db.query.company.findFirst({
          where: and(eq(company.id, input.companyId), eq(company.ownerId, ctx.session.user.id!)),
          columns: { id: true },
        });
        isOwnerQuery = !!co;
      }
    }

    let geoIds: string[] | undefined;

    if (input.radiusMiles && input.city && input.state) {
      const coords = await lookupCityCoords(ctx.db, input.city, input.state);

      if (coords) {
        const result = await ctx.db.execute<{ id: string }>(
          sql`
        SELECT id FROM (
          SELECT id,
            3959 * acos(
              LEAST(1.0, GREATEST(-1.0,
                sin(radians(${coords.lat})) * sin(radians(lat)) +
                cos(radians(${coords.lat})) * cos(radians(lat)) *
                cos(radians(lon) - radians(${coords.lon}))
              ))
            ) AS dist
          FROM "JobPosting"
          WHERE lat IS NOT NULL
            AND lon IS NOT NULL
        ) _sub
        WHERE dist <= ${input.radiusMiles}
        ORDER BY dist
      `,
        );

        geoIds = result.rows.map((r) => r.id);
      }
    }

    const conditions = [
      input.companyId ? eq(jobPosting.companyId, input.companyId) : undefined,
      input.myJobs && ctx.session?.user?.id
        ? eq(jobPosting.employerId, ctx.session.user.id)
        : undefined,
      // Status filter
      isOwnerQuery
        ? input.status?.length
          ? inArray(jobPosting.status, input.status)
          : undefined
        : eq(jobPosting.status, "ACTIVE"),
      // Geo filter
      geoIds !== undefined
        ? geoIds.length > 0
          ? inArray(jobPosting.id, geoIds)
          : sql`false`
        : input.radiusMiles
          ? and(
              input.city ? ilike(jobPosting.city, `%${input.city}%`) : undefined,
              input.state ? ilike(jobPosting.state, `%${input.state}%`) : undefined,
            )
          : undefined,
      input.jobType?.length ? inArray(jobPosting.jobType, input.jobType) : undefined,
      input.workArrangement?.length
        ? inArray(jobPosting.workArrangement, input.workArrangement)
        : undefined,
      input.workDays?.length ? arrayOverlaps(jobPosting.workDays, input.workDays) : undefined,
      // Hide suspended employers' jobs from public browsing (owners still see their own).
      isOwnerQuery
        ? undefined
        : notInArray(
            jobPosting.employerId,
            ctx.db
              .select({ id: employerProfile.userId })
              .from(employerProfile)
              .where(eq(employerProfile.status, "SUSPENDED")),
          ),
    ].filter(Boolean);

    const whereClause =
      conditions.length > 0 ? and(...(conditions as Parameters<typeof and>)) : undefined;

    const jobs = await ctx.db.query.jobPosting.findMany({
      where: whereClause,
      with: {
        requiredLanguages: { with: { language: true } },
        company: { columns: { id: true, name: true, city: true, state: true } },
      },
      orderBy: desc(jobPosting.createdAt),
    });

    if (jobs.length === 0) return [];

    // Fetch application counts
    const jobIds = jobs.map((j) => j.id);
    const countRows = await ctx.db
      .select({ jobId: application.jobId, count: count() })
      .from(application)
      .where(inArray(application.jobId, jobIds))
      .groupBy(application.jobId);
    const countMap = new Map(countRows.map((r) => [r.jobId, r.count]));

    const withCounts = jobs.map((j) => ({
      ...j,
      _count: { applications: countMap.get(j.id) ?? 0 },
    }));

    if (input.sortBy === "closest" && geoIds) {
      const byId = new Map(withCounts.map((r) => [r.id, r]));
      return geoIds
        .map((id) => byId.get(id))
        .filter((r): r is NonNullable<typeof r> => r !== undefined);
    }

    return withCounts;
  }),

  getById: publicProcedure.input(z.object({ id: z.string() })).query(async ({ ctx, input }) => {
    const posting = await ctx.db.query.jobPosting.findFirst({
      where: eq(jobPosting.id, input.id),
      with: {
        requiredLanguages: { with: { language: true } },
        company: {
          columns: { id: true, name: true, city: true, state: true, industry: true },
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
        },
      },
    });

    if (!posting) throw new TRPCError({ code: "NOT_FOUND" });

    const isOwner = ctx.session?.user?.id === posting.employerId;
    if (posting.status !== "ACTIVE" && !isOwner) {
      throw new TRPCError({ code: "NOT_FOUND" });
    }
    // Hide jobs of suspended employers from everyone but the owner.
    if (posting.company.owner.employerProfile?.status === "SUSPENDED" && !isOwner) {
      throw new TRPCError({ code: "NOT_FOUND" });
    }

    const { company: co, ...rest } = posting;
    return {
      ...rest,
      company: {
        id: co.id,
        name: co.name,
        city: co.city,
        state: co.state,
        industry: co.industry,
        employer: {
          isResponsive: co.owner.employerProfile?.isResponsive ?? false,
          isNew:
            !co.owner.employerProfile || co.owner.employerProfile.responsivenessUpdatedAt === null,
        },
      },
    };
  }),

  update: protectedProcedure.input(UpdateJobPostingSchema).mutation(async ({ ctx, input }) => {
    if (ctx.user.role !== "EMPLOYER") throw new TRPCError({ code: "FORBIDDEN" });

    const { id, requiredLanguageIds, ...fields } = input;

    const posting = await ctx.db.query.jobPosting.findFirst({
      where: eq(jobPosting.id, id),
      columns: { id: true, employerId: true, status: true, city: true, state: true },
    });

    if (!posting) throw new TRPCError({ code: "NOT_FOUND" });
    if (posting.employerId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN" });
    if (posting.status === "CLOSED") {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Cannot update a closed listing" });
    }

    let coords: { lat: number; lon: number } | null = null;
    if (fields.city !== undefined || fields.state !== undefined) {
      const resolvedCity = fields.city ?? posting.city;
      const resolvedState = fields.state ?? posting.state;
      coords = await lookupCityCoords(ctx.db, resolvedCity, resolvedState);
      if (!coords) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid city/state" });
      }
    }

    if (requiredLanguageIds !== undefined) {
      await ctx.db.delete(jobLanguage).where(eq(jobLanguage.jobId, id));
      if (requiredLanguageIds.length > 0) {
        await ctx.db
          .insert(jobLanguage)
          .values(requiredLanguageIds.map((languageId) => ({ jobId: id, languageId })));
      }
    }

    const { minHourlyRate: rawRate, ...otherFields } = fields;
    const [updated] = await ctx.db
      .update(jobPosting)
      .set({
        ...otherFields,
        ...(rawRate !== undefined && { minHourlyRate: String(rawRate) }),
        ...(coords && { lat: coords.lat, lon: coords.lon }),
      })
      .where(eq(jobPosting.id, id))
      .returning();
    return updated!;
  }),

  search: publicProcedure
    .input(z.object({ q: z.string().min(1).max(200).trim() }))
    .query(async ({ ctx, input }) => {
      const result = await ctx.db.execute<{ id: string; rank: number }>(
        sql`SELECT id,
               (
                 word_similarity(${input.q}, title) * 2.0 +
                 word_similarity(${input.q}, COALESCE(description, '')) * 1.0
               ) AS rank
        FROM "JobPosting"
        WHERE (
                ${input.q} <% title
                OR ${input.q} <% COALESCE(description, '')
              )
          AND status = 'ACTIVE'
        ORDER BY rank DESC, "createdAt" DESC
        LIMIT 100`,
      );

      const rawRows = result.rows;
      if (rawRows.length === 0) return [];

      const rankMap: Record<string, number> = Object.fromEntries(
        rawRows.map((r) => [r.id, Number(r.rank)]),
      );
      const ids = rawRows.map((r) => r.id);

      const jobs = await ctx.db.query.jobPosting.findMany({
        where: inArray(jobPosting.id, ids),
        with: {
          requiredLanguages: { with: { language: true } },
          company: { columns: { id: true, name: true, city: true, state: true } },
        },
      });

      const countRows = await ctx.db
        .select({ jobId: application.jobId, count: count() })
        .from(application)
        .where(inArray(application.jobId, ids))
        .groupBy(application.jobId);
      const countMap = new Map(countRows.map((r) => [r.jobId, r.count]));

      const withCounts = jobs.map((j) => ({
        ...j,
        _count: { applications: countMap.get(j.id) ?? 0 },
      }));

      const byId = new Map(withCounts.map((j) => [j.id, j]));
      return ids
        .map((id) => byId.get(id))
        .filter((j): j is NonNullable<typeof j> => j !== undefined)
        .map((j) => ({ ...j, rank: rankMap[j.id] ?? 0 }));
    }),

  duplicate: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "EMPLOYER") throw new TRPCError({ code: "FORBIDDEN" });

      const source = await ctx.db.query.jobPosting.findFirst({
        where: eq(jobPosting.id, input.id),
        with: { requiredLanguages: { columns: { languageId: true } } },
      });
      if (!source) throw new TRPCError({ code: "NOT_FOUND" });
      if (source.employerId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN" });

      const {
        id: _id,
        requiredLanguages,
        createdAt: _c,
        updatedAt: _u,
        lastVerifiedAt: _lv,
        closedAt: _ca,
        closureReason: _cr,
        ...sourceFields
      } = source;

      const [created] = await ctx.db
        .insert(jobPosting)
        .values({ ...sourceFields, status: "PAUSED" })
        .returning();

      if (requiredLanguages.length > 0) {
        await ctx.db
          .insert(jobLanguage)
          .values(requiredLanguages.map((l) => ({ jobId: created!.id, languageId: l.languageId })));
      }

      return created!;
    }),

  confirmFreshness: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "EMPLOYER") throw new TRPCError({ code: "FORBIDDEN" });

      const posting = await ctx.db.query.jobPosting.findFirst({
        where: eq(jobPosting.id, input.id),
        columns: { id: true, employerId: true },
      });
      if (!posting) throw new TRPCError({ code: "NOT_FOUND" });
      if (posting.employerId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN" });

      const [updated] = await ctx.db
        .update(jobPosting)
        .set({ lastVerifiedAt: new Date() })
        .where(eq(jobPosting.id, input.id))
        .returning();
      return updated!;
    }),

  close: protectedProcedure.input(CloseJobSchema).mutation(async ({ ctx, input }) => {
    if (ctx.user.role !== "EMPLOYER") throw new TRPCError({ code: "FORBIDDEN" });

    const posting = await ctx.db.query.jobPosting.findFirst({
      where: eq(jobPosting.id, input.id),
      columns: { id: true, employerId: true },
    });

    if (!posting) throw new TRPCError({ code: "NOT_FOUND" });
    if (posting.employerId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN" });

    try {
      const [result] = await ctx.db
        .update(jobPosting)
        .set({
          status: "CLOSED",
          closureReason: input.reason,
          closedAt: new Date(),
        })
        .where(eq(jobPosting.id, input.id))
        .returning({ id: jobPosting.id, status: jobPosting.status });
      return result!;
    } catch (e) {
      console.error("[jobPosting.close] DB update failed:", e);
      throw e;
    }
  }),
});
