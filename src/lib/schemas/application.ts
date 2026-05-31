import { z } from "zod";
import { optionalTrimmedString } from "@/lib/utils";

export const ApplySchema = z.object({
  jobId: z.string().min(1),
  message: optionalTrimmedString(1000),
});

export const ListForJobSchema = z.object({
  jobId: z.string().min(1),
});

export const UpdateApplicationStatusSchema = z.object({
  id: z.string().min(1),
  status: z.enum(["VIEWED", "REJECTED", "CLOSED"]),
});
