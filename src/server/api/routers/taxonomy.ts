import { createTRPCRouter, publicProcedure } from "@/server/api/trpc";

export const taxonomyRouter = createTRPCRouter({
  languages: publicProcedure.query(async ({ ctx }) => {
    return ctx.prisma.language.findMany({ orderBy: { name: "asc" } });
  }),
});
