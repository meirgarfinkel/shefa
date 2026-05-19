import { pgTable, text, doublePrecision, unique, index } from "drizzle-orm/pg-core";
import { createId } from "@paralleldrive/cuid2";

export const state = pgTable("State", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),
  name: text("name").notNull().unique(),
  abbr: text("abbr").notNull().unique(),
  lat: doublePrecision("lat").notNull(),
  lon: doublePrecision("lon").notNull(),
});

export const city = pgTable(
  "City",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    name: text("name").notNull(),
    stateId: text("stateId")
      .notNull()
      .references(() => state.id),
    lat: doublePrecision("lat").notNull(),
    lon: doublePrecision("lon").notNull(),
  },
  (t) => [
    unique("City_name_stateId_key").on(t.name, t.stateId),
    index("City_stateId_idx").on(t.stateId),
  ],
);
