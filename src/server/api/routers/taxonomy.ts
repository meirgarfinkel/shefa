import { createTRPCRouter, publicProcedure } from "@/server/api/trpc";

export const taxonomyRouter = createTRPCRouter({
  skills: publicProcedure.query(async ({ ctx }) => {
    const skills = await ctx.prisma.skill.findMany({
      orderBy: [{ category: "asc" }, { name: "asc" }],
    });
    const groups: Record<string, { id: string; name: string }[]> = {};
    for (const skill of skills) {
      const cat = skill.category ?? "Other";
      (groups[cat] ??= []).push({ id: skill.id, name: skill.name });
    }
    return groups;
  }),

  languages: publicProcedure.query(async ({ ctx }) => {
    return ctx.prisma.language.findMany({ orderBy: { name: "asc" } });
  }),
});
