import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";

export const userRouter = createTRPCRouter({
  setRole: protectedProcedure
    .input(z.object({ role: z.enum(["SEEKER", "EMPLOYER"]) }))
    .mutation(async ({ ctx, input }) => {
      await ctx.prisma.user.update({
        where: { id: ctx.user.id },
        data: { role: input.role },
      });
    }),
});
