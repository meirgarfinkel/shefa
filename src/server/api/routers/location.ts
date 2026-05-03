import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "@/server/api/trpc";

export const locationRouter = createTRPCRouter({
  states: publicProcedure.query(async ({ ctx }) => {
    return ctx.prisma.state.findMany({
      select: { abbr: true, name: true, lat: true, lon: true },
      orderBy: { name: "asc" },
    });
  }),

  citiesByState: publicProcedure
    .input(z.object({ stateAbbr: z.string().length(2) }))
    .query(async ({ ctx, input }) => {
      return ctx.prisma.city.findMany({
        where: { state: { abbr: input.stateAbbr } },
        select: { name: true, lat: true, lon: true },
        orderBy: { name: "asc" },
      });
    }),
});
