import { z } from "zod";

export const ApplySchema = z.object({
  jobId: z.string().min(1),
  message: z
    .string()
    .max(500)
    .optional()
    .transform((v) => (v === "" ? undefined : v)),
});

export const WithdrawApplicationSchema = z.object({
  id: z.string().min(1),
});

export const ListForJobSchema = z.object({
  jobId: z.string().min(1),
});

export const UpdateApplicationStatusSchema = z.object({
  id: z.string().min(1),
  status: z.enum(["VIEWED", "RESPONDED", "CLOSED"]),
});
