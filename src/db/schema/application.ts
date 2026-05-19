import { pgTable, text, varchar, timestamp, unique, index } from "drizzle-orm/pg-core";
import { createId } from "@paralleldrive/cuid2";
import { applicationStatusEnum } from "./enums";
import { users } from "./auth";
import { jobPosting } from "./job";

export const application = pgTable(
  "Application",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    seekerId: text("seekerId")
      .notNull()
      .references(() => users.id),
    jobId: text("jobId")
      .notNull()
      .references(() => jobPosting.id),
    message: varchar("message", { length: 500 }),
    status: applicationStatusEnum("status").notNull().default("SUBMITTED"),
    closedAt: timestamp("closedAt", { withTimezone: true, mode: "date" }),
    createdAt: timestamp("createdAt", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    unique("Application_seekerId_jobId_key").on(t.seekerId, t.jobId),
    index("Application_jobId_createdAt_idx").on(t.jobId, t.createdAt),
    index("Application_jobId_idx").on(t.jobId),
    index("Application_status_idx").on(t.status),
  ],
);
