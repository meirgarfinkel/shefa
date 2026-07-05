import { describe, it, expect } from "vitest";
import { formatHourlyRate } from "@/lib/utils";

describe("formatHourlyRate", () => {
  it("renders USD with a dollar sign", () => {
    expect(formatHourlyRate("18.00", "US")).toBe("$18/hr");
    expect(formatHourlyRate(22.5, "US")).toBe("$22.50/hr");
  });

  it("renders ILS with a shekel sign", () => {
    expect(formatHourlyRate("45.00", "IL")).toBe("₪45/hr");
    expect(formatHourlyRate(45.5, "IL")).toBe("₪45.50/hr");
  });

  it("drops trailing cents for whole amounts, keeps them otherwise", () => {
    expect(formatHourlyRate("15.00", "US")).toBe("$15/hr");
    expect(formatHourlyRate("15.25", "US")).toBe("$15.25/hr");
  });

  it("falls back to the default country for unknown codes", () => {
    // Legacy rows without a country still render as USD.
    expect(formatHourlyRate("15.00", undefined)).toBe("$15/hr");
  });
});
