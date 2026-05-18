import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure, publicProcedure } from "@/server/api/trpc";
import {
  CloseJobSchema,
  CreateJobPostingSchema,
  ListJobPostingsSchema,
  UpdateJobPostingSchema,
} from "@/lib/schemas/jobPosting";
import { JobStatus, type PrismaClient } from "@prisma/client";

async function lookupCityCoords(
  prisma: PrismaClient,
  city: string,
  stateAbbr: string,
): Promise<{ lat: number; lon: number } | null> {
  const record = await prisma.city.findFirst({
    where: { name: { equals: city, mode: "insensitive" }, state: { abbr: stateAbbr } },
    select: { lat: true, lon: true },
  });
  return record ?? null;
}

export const jobPostingRouter = createTRPCRouter({
  create: protectedProcedure.input(CreateJobPostingSchema).mutation(async ({ ctx, input }) => {
    if (ctx.user.role !== "EMPLOYER") throw new TRPCError({ code: "FORBIDDEN" });

    // Verify the company belongs to the caller
    const company = await ctx.prisma.company.findUnique({
      where: { id: input.companyId },
      select: { id: true, ownerId: true },
    });
    if (!company || company.ownerId !== ctx.user.id) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Company not found" });
    }

    const { companyId, requiredLanguageIds, ...fields } = input;
    const coords = await lookupCityCoords(ctx.prisma, fields.city, fields.state);

    if (!coords) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Invalid city/state",
      });
    }

    return ctx.prisma.jobPosting.create({
      data: {
        ...fields,
        employerId: ctx.user.id,
        companyId,
        lat: coords.lat,
        lon: coords.lon,
        ...(requiredLanguageIds.length && {
          requiredLanguages: {
            create: requiredLanguageIds.map((languageId) => ({ languageId })),
          },
        }),
      },
    });
  }),

  list: publicProcedure.input(ListJobPostingsSchema).query(async ({ ctx, input }) => {
    let isOwnerQuery = false;
    if (ctx.session?.user?.role === "EMPLOYER") {
      if (input.myJobs) {
        isOwnerQuery = true;
      } else if (input.companyId) {
        const company = await ctx.prisma.company.findUnique({
          where: { id: input.companyId, ownerId: ctx.session.user.id },
          select: { id: true },
        });
        isOwnerQuery = !!company;
      }
    }

    const statusFilter = isOwnerQuery
      ? input.status?.length
        ? { in: input.status }
        : undefined
      : { in: ["ACTIVE" as const] };

    let geoIds: string[] | undefined;
    if (input.radiusMiles && input.city && input.state) {
      const coords = await lookupCityCoords(ctx.prisma, input.city, input.state);
      if (coords) {
        const rows = await ctx.prisma.$queryRaw<{ id: string }[]>`
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
            WHERE lat IS NOT NULL AND lon IS NOT NULL
          ) _sub
          WHERE dist <= ${input.radiusMiles}
          ORDER BY dist
        `;
        geoIds = rows.map((r) => r.id);
      }
    }

    const results = await ctx.prisma.jobPosting.findMany({
      where: {
        ...(input.companyId && { companyId: input.companyId }),
        ...(input.myJobs && ctx.session?.user?.id && { employerId: ctx.session.user.id }),
        ...(statusFilter !== undefined && { status: statusFilter }),
        ...(geoIds !== undefined
          ? { id: { in: geoIds } }
          : input.radiusMiles
            ? {
                ...(input.city && { city: { contains: input.city, mode: "insensitive" } }),
                ...(input.state && { state: { contains: input.state, mode: "insensitive" } }),
              }
            : {}),
        ...(input.jobType?.length && { jobType: { in: input.jobType } }),
        ...(input.workArrangement?.length && { workArrangement: { in: input.workArrangement } }),
        ...(input.workDays?.length && { workDays: { hasSome: input.workDays } }),
      },
      include: {
        requiredLanguages: { include: { language: true } },
        company: { select: { id: true, name: true, city: true, state: true } },
        _count: { select: { applications: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    if (input.sortBy === "closest" && geoIds) {
      const byId = new Map(results.map((r) => [r.id, r]));
      return geoIds.map((id) => byId.get(id)).filter((r) => r !== undefined);
    }

    return results;
  }),

  getById: publicProcedure.input(z.object({ id: z.string() })).query(async ({ ctx, input }) => {
    const posting = await ctx.prisma.jobPosting.findUnique({
      where: { id: input.id },
      include: {
        requiredLanguages: { include: { language: true } },
        company: {
          select: {
            id: true,
            name: true,
            city: true,
            state: true,
            industry: true,
            owner: { select: { employerProfile: { select: { isResponsive: true } } } },
          },
        },
      },
    });

    if (!posting) throw new TRPCError({ code: "NOT_FOUND" });

    if (posting.status === "ACTIVE") return posting;

    // Non-active: only the owning employer may view
    if (ctx.session?.user?.id !== posting.employerId) {
      throw new TRPCError({ code: "NOT_FOUND" });
    }

    return posting;
  }),

  update: protectedProcedure.input(UpdateJobPostingSchema).mutation(async ({ ctx, input }) => {
    if (ctx.user.role !== "EMPLOYER") throw new TRPCError({ code: "FORBIDDEN" });

    const { id, requiredLanguageIds, ...fields } = input;

    const posting = await ctx.prisma.jobPosting.findUnique({
      where: { id },
      select: { id: true, employerId: true, status: true, city: true, state: true },
    });

    if (!posting) throw new TRPCError({ code: "NOT_FOUND" });
    if (posting.employerId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN" });
    if (posting.status === "CLOSED") {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Cannot update a closed listing" });
    }

    let coords: { lat: number; lon: number } | null = null;
    if (fields.city !== undefined || fields.state !== undefined) {
      const city = fields.city ?? posting.city;
      const state = fields.state ?? posting.state;
      coords = await lookupCityCoords(ctx.prisma, city, state);

      if (!coords) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Invalid city/state",
        });
      }
    }

    return ctx.prisma.jobPosting.update({
      where: { id },
      data: {
        ...fields,
        ...(coords && { lat: coords.lat, lon: coords.lon }),
        ...(requiredLanguageIds !== undefined && {
          requiredLanguages: {
            deleteMany: {},
            create: requiredLanguageIds.map((languageId) => ({ languageId })),
          },
        }),
      },
    });
  }),

  search: publicProcedure
    .input(z.object({ q: z.string().min(1).max(200).trim() }))
    .query(async ({ ctx, input }) => {
      const rows = await ctx.prisma.$queryRaw<{ id: string; rank: number }[]>`
        SELECT id,
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
        LIMIT 100
      `;

      if (rows.length === 0) return [];

      const rankMap: Record<string, number> = Object.fromEntries(
        rows.map((r) => [r.id, Number(r.rank)]),
      );
      const ids = rows.map((r) => r.id);

      const jobs = await ctx.prisma.jobPosting.findMany({
        where: { id: { in: ids } },
        include: {
          requiredLanguages: { include: { language: true } },
          company: { select: { id: true, name: true, city: true, state: true } },
          _count: { select: { applications: true } },
        },
      });

      const byId = new Map(jobs.map((j) => [j.id, j]));
      return ids
        .map((id) => byId.get(id))
        .filter((j) => j !== undefined)
        .map((j) => ({ ...j, rank: rankMap[j.id] ?? 0 }));
    }),

  duplicate: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "EMPLOYER") throw new TRPCError({ code: "FORBIDDEN" });

      const source = await ctx.prisma.jobPosting.findUnique({
        where: { id: input.id },
        include: { requiredLanguages: true },
      });
      if (!source) throw new TRPCError({ code: "NOT_FOUND" });
      if (source.employerId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN" });

      return ctx.prisma.jobPosting.create({
        data: {
          employerId: source.employerId,
          companyId: source.companyId,
          title: source.title,
          description: source.description,
          jobType: source.jobType,
          workArrangement: source.workArrangement,
          city: source.city,
          state: source.state,
          lat: source.lat,
          lon: source.lon,
          minHourlyRate: source.minHourlyRate,
          payNotes: source.payNotes,
          workDays: source.workDays,
          scheduleNotes: source.scheduleNotes,
          workAuthRequired: source.workAuthRequired,
          whatWeTeach: source.whatWeTeach,
          whatWereLookingFor: source.whatWereLookingFor,
          status: "PAUSED",
          ...(source.requiredLanguages.length && {
            requiredLanguages: {
              create: source.requiredLanguages.map((l) => ({ languageId: l.languageId })),
            },
          }),
        },
      });
    }),

  confirmFreshness: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "EMPLOYER") throw new TRPCError({ code: "FORBIDDEN" });

      const posting = await ctx.prisma.jobPosting.findUnique({
        where: { id: input.id },
        select: { id: true, employerId: true },
      });
      if (!posting) throw new TRPCError({ code: "NOT_FOUND" });
      if (posting.employerId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN" });

      return ctx.prisma.jobPosting.update({
        where: { id: input.id },
        data: { lastVerifiedAt: new Date() },
      });
    }),

  close: protectedProcedure.input(CloseJobSchema).mutation(async ({ ctx, input }) => {
    if (ctx.user.role !== "EMPLOYER") throw new TRPCError({ code: "FORBIDDEN" });

    const posting = await ctx.prisma.jobPosting.findUnique({
      where: { id: input.id },
      select: { id: true, employerId: true },
    });

    if (!posting) throw new TRPCError({ code: "NOT_FOUND" });
    if (posting.employerId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN" });

    try {
      const result = await ctx.prisma.jobPosting.update({
        where: { id: input.id },
        data: {
          status: JobStatus.CLOSED,
          closureReason: input.reason,
          closedAt: new Date(),
        },
      });
      return { id: result.id, status: result.status };
    } catch (e) {
      console.error("[jobPosting.close] DB update failed:", e);
      throw e;
    }
  }),
});
