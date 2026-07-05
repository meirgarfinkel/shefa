import { describe, it, expect } from "vitest";
import {
  SUPPORTED_COUNTRIES,
  COUNTRY_CONFIG,
  DEFAULT_COUNTRY,
  isCountryCode,
} from "@/lib/constants/countries";

describe("country config", () => {
  it("has a config entry for every supported country", () => {
    for (const code of SUPPORTED_COUNTRIES) {
      expect(COUNTRY_CONFIG[code]).toBeTruthy();
      expect(COUNTRY_CONFIG[code].code).toBe(code);
    }
  });

  it("US uses USD, miles, and a State region", () => {
    const us = COUNTRY_CONFIG.US;
    expect(us.currency).toBe("USD");
    expect(us.currencySymbol).toBe("$");
    expect(us.distanceUnit).toBe("mi");
    expect(us.flat).toBe(false);
    expect(us.regionLabel).toBe("State");
  });

  it("IL uses ILS, km, and is flat (no region dropdown)", () => {
    const il = COUNTRY_CONFIG.IL;
    expect(il.currency).toBe("ILS");
    expect(il.currencySymbol).toBe("₪");
    expect(il.distanceUnit).toBe("km");
    expect(il.flat).toBe(true);
    // Flat countries auto-assign a fixed region code behind the scenes.
    expect(il.flatRegionCode).toBe("IL");
  });

  it("haversine constants match each unit (miles vs km)", () => {
    expect(COUNTRY_CONFIG.US.earthRadius).toBe(3959);
    expect(COUNTRY_CONFIG.US.degPerUnit).toBeCloseTo(69, 0);
    expect(COUNTRY_CONFIG.IL.earthRadius).toBe(6371);
    expect(COUNTRY_CONFIG.IL.degPerUnit).toBeCloseTo(111, 0);
  });

  it("DEFAULT_COUNTRY is a supported country", () => {
    expect(SUPPORTED_COUNTRIES).toContain(DEFAULT_COUNTRY);
  });

  it("isCountryCode narrows only valid codes", () => {
    expect(isCountryCode("US")).toBe(true);
    expect(isCountryCode("IL")).toBe(true);
    expect(isCountryCode("GB")).toBe(false);
    expect(isCountryCode("")).toBe(false);
  });
});
