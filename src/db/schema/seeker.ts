import { pgTable, text, boolean, varchar, timestamp, index, primaryKey } from "drizzle-orm/pg-core";
import { createId } from "@paralleldrive/cuid2";
import { profileStatusEnum, educationLevelEnum, dayOfWeekEnum } from "./enums";
import { users } from "./auth";
import { language } from "./taxonomy";

export const seekerProfile = pgTable(
  "SeekerProfile",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    userId: text("userId")
      .notNull()
      .unique()
      .references(() => users.id),
    firstName: text("firstName").notNull(),
    lastName: text("lastName").notNull(),
    country: text("country").notNull().default("US"),
    city: text("city").notNull(),
    state: text("state").notNull(),
    workAuthorization: boolean("workAuthorization").notNull(),
    availableDays: dayOfWeekEnum("availableDays").array().notNull(),
    jobSeekText: varchar("jobSeekText", { length: 1000 }).notNull(),
    educationLevel: educationLevelEnum("educationLevel"),
    about: varchar("about", { length: 1000 }),
    resumeUrl: text("resumeUrl"),
    status: profileStatusEnum("status").notNull().default("ACTIVE"),
    createdAt: timestamp("createdAt", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [index("SeekerProfile_status_idx").on(t.status)],
);

export const seekerLanguage = pgTable(
  "SeekerLanguage",
  {
    seekerProfileId: text("seekerProfileId")
      .notNull()
      .references(() => seekerProfile.id),
    languageId: text("languageId")
      .notNull()
      .references(() => language.id),
  },
  (t) => [primaryKey({ columns: [t.seekerProfileId, t.languageId] })],
);
