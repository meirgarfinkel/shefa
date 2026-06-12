import { pgTable, text, timestamp, index } from "drizzle-orm/pg-core";
import { createId } from "@paralleldrive/cuid2";
import { feedbackCategoryEnum, feedbackStatusEnum } from "./enums";
import { users } from "./auth";

// User-submitted feedback to admins (bugs / improvements / thanks). Unlike a Report,
// feedback has no target — it is a general message about the platform. Surfaced in
// /admin alongside reports. See PROJECT_SPEC §2.
export const feedback = pgTable(
  "Feedback",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    userId: text("userId")
      .notNull()
      .references(() => users.id),
    category: feedbackCategoryEnum("category").notNull(),
    message: text("message").notNull(),
    status: feedbackStatusEnum("status").notNull().default("OPEN"),
    createdAt: timestamp("createdAt", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  },
  (t) => [
    index("Feedback_status_idx").on(t.status),
    index("Feedback_userId_createdAt_idx").on(t.userId, t.createdAt),
  ],
);
