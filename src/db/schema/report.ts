import { pgTable, text, timestamp, index } from "drizzle-orm/pg-core";
import { createId } from "@paralleldrive/cuid2";
import { reportTargetTypeEnum, reportStatusEnum } from "./enums";
import { users } from "./auth";

export const report = pgTable(
  "Report",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    reporterId: text("reporterId")
      .notNull()
      .references(() => users.id),
    targetType: reportTargetTypeEnum("targetType").notNull(),
    targetId: text("targetId").notNull(),
    reason: text("reason").notNull(),
    status: reportStatusEnum("status").notNull().default("OPEN"),
    createdAt: timestamp("createdAt", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  },
  (t) => [
    index("Report_status_idx").on(t.status),
    index("Report_targetType_targetId_idx").on(t.targetType, t.targetId),
  ],
);
