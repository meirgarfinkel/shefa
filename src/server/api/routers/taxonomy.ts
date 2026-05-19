import { asc } from "drizzle-orm";
import { createTRPCRouter, publicProcedure } from "@/server/api/trpc";
import { language } from "@/db/schema";

export const taxonomyRouter = createTRPCRouter({
  languages: publicProcedure.query(async ({ ctx }) => {
    return ctx.db.select().from(language).orderBy(asc(language.name));
  }),
});
