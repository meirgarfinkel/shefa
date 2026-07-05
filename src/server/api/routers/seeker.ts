import { z } from "zod";
import { eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure, publicProcedure } from "@/server/api/trpc";
import { CreateSeekerProfileSchema, UpdateSeekerProfileSchema } from "@/lib/schemas/seeker";
import { seekerProfile, seekerLanguage, users } from "@/db/schema";

export const seekerRouter = createTRPCRouter({
  getPublicProfile: publicProcedure
    .input(z.object({ id: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      const profile = await ctx.db.query.seekerProfile.findFirst({
        where: eq(seekerProfile.id, input.id),
        with: {
          languages: { with: { language: { columns: { name: true } } } },
        },
      });
      if (!profile) throw new TRPCError({ code: "NOT_FOUND" });
      // Suspended profiles are hidden from public view (moderation); deleted profiles
      // belong to soft-deleted accounts.
      if (profile.status === "SUSPENDED" || profile.status === "DELETED") {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      const { userId: _userId, languages, ...publicFields } = profile;
      return {
        ...publicFields,
        languages: languages.map((l) => l.language.name),
      };
    }),

  getMyProfile: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.user.role !== "SEEKER") {
      throw new TRPCError({ code: "FORBIDDEN" });
    }
    const profile = await ctx.db.query.seekerProfile.findFirst({
      where: eq(seekerProfile.userId, ctx.user.id),
      columns: { id: true, country: true, city: true, state: true },
    });
    return profile ?? null;
  }),

  getMyFullProfile: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.user.role !== "SEEKER") {
      throw new TRPCError({ code: "FORBIDDEN" });
    }
    const profile = await ctx.db.query.seekerProfile.findFirst({
      where: eq(seekerProfile.userId, ctx.user.id),
      with: {
        languages: { columns: { languageId: true } },
      },
    });
    if (!profile) return null;
    const { languages, ...rest } = profile;
    return {
      ...rest,
      languageIds: languages.map((l) => l.languageId),
    };
  }),

  updateProfile: protectedProcedure
    .input(UpdateSeekerProfileSchema)
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "SEEKER") {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      const profile = await ctx.db.query.seekerProfile.findFirst({
        where: eq(seekerProfile.userId, ctx.user.id),
        columns: { id: true },
      });
      if (!profile) throw new TRPCError({ code: "NOT_FOUND" });

      const { languageIds, ...profileFields } = input;

      if (languageIds !== undefined) {
        await ctx.db.delete(seekerLanguage).where(eq(seekerLanguage.seekerProfileId, profile.id));
        if (languageIds.length > 0) {
          await ctx.db
            .insert(seekerLanguage)
            .values(languageIds.map((languageId) => ({ seekerProfileId: profile.id, languageId })));
        }
      }

      const [updated] = await ctx.db
        .update(seekerProfile)
        .set(profileFields)
        .where(eq(seekerProfile.userId, ctx.user.id))
        .returning();
      return updated!;
    }),

  createProfile: protectedProcedure
    .input(CreateSeekerProfileSchema)
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "SEEKER") {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      const existing = await ctx.db.query.seekerProfile.findFirst({
        where: eq(seekerProfile.userId, ctx.user.id),
        columns: { id: true },
      });
      if (existing) {
        throw new TRPCError({ code: "CONFLICT", message: "Profile already exists" });
      }

      const { languageIds, isAdult: _isAdult, ...profileFields } = input;

      await ctx.db.update(users).set({ isAdult: true }).where(eq(users.id, ctx.user.id));

      const [created] = await ctx.db
        .insert(seekerProfile)
        .values({ ...profileFields, userId: ctx.user.id })
        .returning();

      if (languageIds?.length) {
        await ctx.db
          .insert(seekerLanguage)
          .values(languageIds.map((languageId) => ({ seekerProfileId: created!.id, languageId })));
      }

      return created!;
    }),
});
