import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { z } from "zod";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
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
