import { pgTable, text, timestamp, index } from "drizzle-orm/pg-core";
import { createId } from "@paralleldrive/cuid2";
import { pingTypeEnum, pingResponseEnum } from "./enums";
import { users } from "./auth";
import { seekerProfile } from "./seeker";
import { jobPosting } from "./job";

export const verificationPing = pgTable(
  "VerificationPing",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    type: pingTypeEnum("type").notNull(),
    sentAt: timestamp("sentAt", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
    respondedAt: timestamp("respondedAt", { withTimezone: true, mode: "date" }),
    response: pingResponseEnum("response"),
    userId: text("userId").references(() => users.id),
    seekerProfileId: text("seekerProfileId").references(() => seekerProfile.id),
    jobId: text("jobId").references(() => jobPosting.id),
  },
  (t) => [
    index("VerificationPing_userId_idx").on(t.userId),
    index("VerificationPing_jobId_idx").on(t.jobId),
  ],
);

export const freshnessToken = pgTable(
  "FreshnessToken",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    token: text("token").notNull().unique(),
    targetType: text("targetType").notNull(),
    targetId: text("targetId").notNull(),
    action: pingResponseEnum("action").notNull(),
    pingId: text("pingId").references(() => verificationPing.id),
    expiresAt: timestamp("expiresAt", { withTimezone: true, mode: "date" }).notNull(),
    usedAt: timestamp("usedAt", { withTimezone: true, mode: "date" }),
  },
  (t) => [
    index("FreshnessToken_targetType_targetId_idx").on(t.targetType, t.targetId),
    index("FreshnessToken_expiresAt_idx").on(t.expiresAt),
  ],
);
