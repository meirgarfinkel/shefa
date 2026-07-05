import { pgTable, text, doublePrecision, unique, index } from "drizzle-orm/pg-core";
import { createId } from "@paralleldrive/cuid2";

export const state = pgTable(
  "State",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    // ISO 3166-1 alpha-2 country code (e.g. "US", "IL"). A "state" is a region within
    // a country; name/abbr are unique per-country, not globally.
    country: text("country").notNull().default("US"),
    name: text("name").notNull(),
    abbr: text("abbr").notNull(),
    lat: doublePrecision("lat").notNull(),
    lon: doublePrecision("lon").notNull(),
  },
  (t) => [
    unique("State_country_abbr_key").on(t.country, t.abbr),
    unique("State_country_name_key").on(t.country, t.name),
    index("State_country_idx").on(t.country),
  ],
);

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
