import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { z } from "zod";
import { countryConfig } from "@/lib/constants/countries";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function pluralize(count: number, singular: string, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`;
}

export function getInitials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .filter(Boolean)
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

/**
 * Format an hourly pay rate with the country's currency symbol, e.g. "$18/hr" or
 * "₪45/hr". Whole amounts drop the cents; fractional amounts keep two decimals.
 * Unknown/legacy country values fall back to the default country (USD).
 */
export function formatHourlyRate(
  rate: string | number,
  country: string | null | undefined,
): string {
  const { currencySymbol } = countryConfig(country);
  const n = Number(rate);
  const amount = Number.isInteger(n) ? String(n) : n.toFixed(2);
  return `${currencySymbol}${amount}/hr`;
}

export const requiredTrimmedString = (max: number) => z.string().trim().min(1).max(max);

export const optionalTrimmedString = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((v) => (v === "" ? undefined : v))
    .optional();

export const optionalHttpUrl = z
  .url({ protocol: /^https?$/ })
  .trim()
  .transform((v) => (v === "" ? undefined : v))
  .optional();
