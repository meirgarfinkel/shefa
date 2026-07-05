// Canonical per-country configuration. Shefa serves the USA and Israel; every
// country-specific assumption (currency, distance units, region model) lives here so
// there is one source of truth instead of inline "US"/"USD"/miles literals scattered
// across the app. See PROJECT_SPEC.md for the multi-country model.

export const SUPPORTED_COUNTRIES = ["US", "IL"] as const;
export type CountryCode = (typeof SUPPORTED_COUNTRIES)[number];

export const DEFAULT_COUNTRY: CountryCode = "US";

export interface CountryConfig {
  code: CountryCode;
  /** Human-readable country name (used in work-auth copy and dropdowns). */
  name: string;
  /** ISO 4217 code, emitted in job-posting JSON-LD. */
  currency: string;
  /** Symbol used when rendering pay rates. */
  currencySymbol: string;
  distanceUnit: "mi" | "km";
  /** Earth radius in `distanceUnit`, for the haversine job-distance search. */
  earthRadius: number;
  /** `distanceUnit` per degree of latitude, for the bounding-box pre-filter. */
  degPerUnit: number;
  /** Radius presets offered in the jobs filter, in `distanceUnit`. */
  radiusOptions: number[];
  /** Label for the region (middle) dropdown in the location picker. */
  regionLabel: string;
  /**
   * When true, the country has no user-facing region level: the picker hides the
   * region dropdown and cities are chosen directly under the country. Records still
   * store a fixed `flatRegionCode` in their `state` field so the seeded City→State
   * join (and `lookupCityCoords`) keeps working unchanged.
   */
  flat: boolean;
  /** The region code stored in `state` for a flat country. */
  flatRegionCode?: string;
}

export const COUNTRY_CONFIG: Record<CountryCode, CountryConfig> = {
  US: {
    code: "US",
    name: "United States",
    currency: "USD",
    currencySymbol: "$",
    distanceUnit: "mi",
    earthRadius: 3959,
    degPerUnit: 69,
    radiusOptions: [5, 10, 25, 50, 100],
    regionLabel: "State",
    flat: false,
  },
  IL: {
    code: "IL",
    name: "Israel",
    currency: "ILS",
    currencySymbol: "₪",
    distanceUnit: "km",
    earthRadius: 6371,
    degPerUnit: 111,
    radiusOptions: [5, 10, 25, 50, 100],
    regionLabel: "District",
    flat: true,
    flatRegionCode: "IL",
  },
};

export function isCountryCode(value: string): value is CountryCode {
  return (SUPPORTED_COUNTRIES as readonly string[]).includes(value);
}

/** Country config, falling back to the default country for legacy/unknown values. */
export function countryConfig(country: string | null | undefined): CountryConfig {
  return isCountryCode(country ?? "")
    ? COUNTRY_CONFIG[country as CountryCode]
    : COUNTRY_CONFIG[DEFAULT_COUNTRY];
}
