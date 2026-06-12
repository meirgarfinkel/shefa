import {
  pgTable,
  text,
  varchar,
  boolean,
  timestamp,
  doublePrecision,
  decimal,
  index,
  primaryKey,
} from "drizzle-orm/pg-core";
import { createId } from "@paralleldrive/cuid2";
import {
  jobStatusEnum,
  jobClosureReasonEnum,
  jobTypeEnum,
  workArrangementEnum,
  dayOfWeekEnum,
} from "./enums";
import { users } from "./auth";
import { business } from "./employer";
import { language } from "./taxonomy";

export const jobPosting = pgTable(
  "JobPosting",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    employerId: text("employerId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    businessId: text("businessId")
      .notNull()
      .references(() => business.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    description: varchar("description", { length: 5000 }).notNull(),
    jobType: jobTypeEnum("jobType").notNull(),
    workArrangement: workArrangementEnum("workArrangement").notNull(),
    city: text("city").notNull(),
    state: text("state").notNull(),
    lat: doublePrecision("lat").notNull(),
    lon: doublePrecision("lon").notNull(),
    minHourlyRate: decimal("minHourlyRate", { precision: 8, scale: 2 }).notNull(),
    payNotes: text("payNotes"),
    workDays: dayOfWeekEnum("workDays").array().notNull(),
    scheduleNotes: text("scheduleNotes"),
    workAuthRequired: boolean("workAuthRequired").notNull(),
    whatWereLookingFor: varchar("whatWereLookingFor", { length: 1000 }),
    status: jobStatusEnum("status").notNull().default("ACTIVE"),
    closureReason: jobClosureReasonEnum("closureReason"),
    closedAt: timestamp("closedAt", { withTimezone: true, mode: "date" }),
    // Set only when closed as FILLED_ON_SHEFA and the employer names the hire.
    // Nullable, cleared on reopen. The pointed-to application is still CLOSED by
    // the close cascade — this just records which applicant got the role.
    hiredApplicationId: text("hiredApplicationId"),
    lastVerifiedAt: timestamp("lastVerifiedAt", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
    createdAt: timestamp("createdAt", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    index("JobPosting_status_idx").on(t.status),
    index("JobPosting_employerId_status_createdAt_idx").on(t.employerId, t.status, t.createdAt),
    index("JobPosting_status_jobType_idx").on(t.status, t.jobType),
    index("JobPosting_status_workArrangement_idx").on(t.status, t.workArrangement),
    index("JobPosting_status_createdAt_idx").on(t.status, t.createdAt),
    index("JobPosting_employerId_idx").on(t.employerId),
    index("JobPosting_businessId_idx").on(t.businessId),
    index("JobPosting_lat_lon_idx").on(t.lat, t.lon),
    index("JobPosting_closedAt_idx").on(t.closedAt),
  ],
);

export const jobLanguage = pgTable(
  "JobLanguage",
  {
    jobId: text("jobId")
      .notNull()
      .references(() => jobPosting.id),
    languageId: text("languageId")
      .notNull()
      .references(() => language.id),
  },
  (t) => [primaryKey({ columns: [t.jobId, t.languageId] })],
);
