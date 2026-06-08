import { z } from "zod";
import { eq } from "drizzle-orm";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { users } from "@/db/schema";
import { softDeleteAccount } from "@/server/account";

export const userRouter = createTRPCRouter({
  setRole: protectedProcedure
    .input(z.object({ role: z.enum(["SEEKER", "EMPLOYER"]) }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.update(users).set({ role: input.role }).where(eq(users.id, ctx.user.id));
      return { success: true };
    }),

  deleteAccount: protectedProcedure.mutation(async ({ ctx }) => {
    await softDeleteAccount(ctx.db, ctx.user.id);
    return { success: true };
  }),
});
