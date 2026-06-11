import { pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { createId } from "@paralleldrive/cuid2";
import { notificationFrequencyEnum } from "./enums";
import { users } from "./auth";

export const notificationPreferences = pgTable("NotificationPreferences", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),
  userId: text("userId")
    .notNull()
    .unique()
    .references(() => users.id),
  messageNotifications: notificationFrequencyEnum("messageNotifications")
    .notNull()
    .default("PER_MESSAGE"),
  applicationNotifications: notificationFrequencyEnum("applicationNotifications")
    .notNull()
    .default("PER_MESSAGE"),
  // Last time a daily digest was sent to this user. Used to keep the digest cron
  // idempotent across Vercel retries / manual re-triggers (skip if sent within the window).
  lastDigestSentAt: timestamp("lastDigestSentAt", { withTimezone: true, mode: "date" }),
  updatedAt: timestamp("updatedAt", { withTimezone: true, mode: "date" })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});
