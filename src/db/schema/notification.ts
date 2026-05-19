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
  updatedAt: timestamp("updatedAt", { withTimezone: true, mode: "date" })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});
