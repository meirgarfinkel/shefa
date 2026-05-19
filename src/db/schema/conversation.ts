import { pgTable, text, varchar, boolean, timestamp, unique, index } from "drizzle-orm/pg-core";
import { createId } from "@paralleldrive/cuid2";
import { users } from "./auth";
import { jobPosting } from "./job";

export const conversation = pgTable(
  "Conversation",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    seekerId: text("seekerId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    employerId: text("employerId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    jobId: text("jobId").references(() => jobPosting.id),
    lastMessageAt: timestamp("lastMessageAt", { withTimezone: true, mode: "date" }),
    lastMessagePreview: varchar("lastMessagePreview", { length: 80 }),
    seekerBlocked: boolean("seekerBlocked").notNull().default(false),
    employerBlocked: boolean("employerBlocked").notNull().default(false),
    createdAt: timestamp("createdAt", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    unique("Conversation_seekerId_employerId_jobId_key").on(t.seekerId, t.employerId, t.jobId),
    index("Conversation_seekerId_idx").on(t.seekerId),
    index("Conversation_employerId_idx").on(t.employerId),
    index("Conversation_seekerId_lastMessageAt_idx").on(t.seekerId, t.lastMessageAt),
    index("Conversation_employerId_lastMessageAt_idx").on(t.employerId, t.lastMessageAt),
    index("Conversation_lastMessageAt_idx").on(t.lastMessageAt),
  ],
);

export const message = pgTable(
  "Message",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    conversationId: text("conversationId")
      .notNull()
      .references(() => conversation.id, { onDelete: "cascade" }),
    senderId: text("senderId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    body: varchar("body", { length: 5000 }).notNull(),
    readAt: timestamp("readAt", { withTimezone: true, mode: "date" }),
    createdAt: timestamp("createdAt", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  },
  (t) => [
    index("Message_conversationId_createdAt_idx").on(t.conversationId, t.createdAt),
    index("Message_conversationId_readAt_idx").on(t.conversationId, t.readAt),
  ],
);
