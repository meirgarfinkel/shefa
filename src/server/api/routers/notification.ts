import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";

const NotificationFrequency = z.enum(["PER_MESSAGE", "DAILY_DIGEST", "OFF"]);

const updateInput = z.object({
  messageNotifications: NotificationFrequency.optional(),
  applicationNotifications: NotificationFrequency.optional(),
});

export const notificationRouter = createTRPCRouter({
  getPreferences: protectedProcedure.query(async ({ ctx }) => {
    return ctx.prisma.notificationPreferences.upsert({
      where: { userId: ctx.user.id },
      update: {},
      create: {
        userId: ctx.user.id,
        messageNotifications: "PER_MESSAGE",
        applicationNotifications: "PER_MESSAGE",
      },
    });
  }),

  updatePreferences: protectedProcedure.input(updateInput).mutation(async ({ ctx, input }) => {
    return ctx.prisma.notificationPreferences.upsert({
      where: { userId: ctx.user.id },
      update: { ...input },
      create: {
        userId: ctx.user.id,
        messageNotifications: "PER_MESSAGE",
        applicationNotifications: "PER_MESSAGE",
        ...input,
      },
    });
  }),
});
