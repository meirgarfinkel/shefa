import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { notificationPreferences } from "@/db/schema";

const NotificationFrequency = z.enum(["PER_MESSAGE", "DAILY_DIGEST", "OFF"]);

const updateInput = z.object({
  messageNotifications: NotificationFrequency.optional(),
  applicationNotifications: NotificationFrequency.optional(),
});

export const notificationRouter = createTRPCRouter({
  getPreferences: protectedProcedure.query(async ({ ctx }) => {
    const [result] = await ctx.db
      .insert(notificationPreferences)
      .values({
        userId: ctx.user.id,
        messageNotifications: "PER_MESSAGE",
        applicationNotifications: "PER_MESSAGE",
      })
      .onConflictDoUpdate({
        target: notificationPreferences.userId,
        set: { updatedAt: new Date() },
      })
      .returning();
    return result!;
  }),

  updatePreferences: protectedProcedure.input(updateInput).mutation(async ({ ctx, input }) => {
    const [result] = await ctx.db
      .insert(notificationPreferences)
      .values({
        userId: ctx.user.id,
        messageNotifications: "PER_MESSAGE",
        applicationNotifications: "PER_MESSAGE",
      })
      .onConflictDoUpdate({
        target: notificationPreferences.userId,
        set: {
          ...(input.messageNotifications !== undefined && {
            messageNotifications: input.messageNotifications,
          }),
          ...(input.applicationNotifications !== undefined && {
            applicationNotifications: input.applicationNotifications,
          }),
          updatedAt: new Date(),
        },
      })
      .returning();
    return result!;
  }),
});
