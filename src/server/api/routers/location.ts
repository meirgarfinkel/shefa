import { z } from "zod";
import { eq, and, asc } from "drizzle-orm";
import { createTRPCRouter, publicProcedure } from "@/server/api/trpc";
import { state, city } from "@/db/schema";
import { SUPPORTED_COUNTRIES } from "@/lib/constants/countries";

const Country = z.enum(SUPPORTED_COUNTRIES);

export const locationRouter = createTRPCRouter({
  states: publicProcedure.input(z.object({ country: Country })).query(async ({ ctx, input }) => {
    return ctx.db
      .select({ abbr: state.abbr, name: state.name, lat: state.lat, lon: state.lon })
      .from(state)
      .where(eq(state.country, input.country))
      .orderBy(asc(state.name));
  }),

  citiesByState: publicProcedure
    // `stateAbbr` is no longer strictly 2 chars (flat countries use a country-level
    // region code). Scoping by country too guards against abbr collisions across
    // countries.
    .input(z.object({ country: Country, stateAbbr: z.string().min(1).max(10) }))
    .query(async ({ ctx, input }) => {
      return ctx.db
        .select({ name: city.name, lat: city.lat, lon: city.lon })
        .from(city)
        .innerJoin(state, eq(city.stateId, state.id))
        .where(and(eq(state.country, input.country), eq(state.abbr, input.stateAbbr)))
        .orderBy(asc(city.name));
    }),
});
