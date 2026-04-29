import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";

export const reportRouter = createTRPCRouter({
  submit: protectedProcedure
    .input(
      z.object({
        targetType: z.enum(["USER", "JOB", "MESSAGE"]),
        targetId: z.string().min(1),
        reason: z.string().min(1).max(2000),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (input.targetType === "USER" && input.targetId === ctx.user.id) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Cannot report yourself" });
      }

      return ctx.prisma.report.create({
        data: {
          reporterId: ctx.user.id,
          targetType: input.targetType,
          targetId: input.targetId,
          reason: input.reason,
        },
      });
    }),
});
