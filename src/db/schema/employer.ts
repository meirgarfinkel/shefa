import { pgTable, text, varchar, boolean, timestamp, unique, index } from "drizzle-orm/pg-core";
import { createId } from "@paralleldrive/cuid2";
import { profileStatusEnum, industryEnum, businessSizeEnum } from "./enums";
import { users } from "./auth";

export const employerProfile = pgTable(
  "EmployerProfile",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    userId: text("userId")
      .notNull()
      .unique()
      .references(() => users.id, { onDelete: "cascade" }),
    firstName: text("firstName").notNull(),
    lastName: text("lastName").notNull(),
    roleAtBusiness: varchar("roleAtBusiness", { length: 200 }),
    status: profileStatusEnum("status").notNull().default("ACTIVE"),
    isResponsive: boolean("isResponsive").notNull().default(false),
    responsivenessUpdatedAt: timestamp("responsivenessUpdatedAt", {
      withTimezone: true,
      mode: "date",
    }),
    createdAt: timestamp("createdAt", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [index("EmployerProfile_status_idx").on(t.status)],
);

export const business = pgTable(
  "Business",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    ownerId: text("ownerId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    country: text("country").notNull().default("US"),
    city: text("city").notNull(),
    state: text("state").notNull(),
    website: text("website"),
    industry: industryEnum("industry"),
    businessSize: businessSizeEnum("businessSize"),
    aboutBusiness: varchar("aboutBusiness", { length: 2000 }),
    missionText: varchar("missionText", { length: 1000 }),
  },
  (t) => [
    unique("Business_ownerId_name_key").on(t.ownerId, t.name),
    index("Business_ownerId_idx").on(t.ownerId),
  ],
);
