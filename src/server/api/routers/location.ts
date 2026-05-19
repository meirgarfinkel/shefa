import { z } from "zod";
import { eq, asc } from "drizzle-orm";
import { createTRPCRouter, publicProcedure } from "@/server/api/trpc";
import { state, city } from "@/db/schema";

export const locationRouter = createTRPCRouter({
  states: publicProcedure.query(async ({ ctx }) => {
    return ctx.db
      .select({ abbr: state.abbr, name: state.name, lat: state.lat, lon: state.lon })
      .from(state)
      .orderBy(asc(state.name));
  }),

  citiesByState: publicProcedure
    .input(z.object({ stateAbbr: z.string().length(2) }))
    .query(async ({ ctx, input }) => {
      return ctx.db
        .select({ name: city.name, lat: city.lat, lon: city.lon })
        .from(city)
        .innerJoin(state, eq(city.stateId, state.id))
        .where(eq(state.abbr, input.stateAbbr))
        .orderBy(asc(city.name));
    }),
});
