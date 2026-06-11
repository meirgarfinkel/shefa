import { z } from "zod";
import { optionalTrimmedString } from "@/lib/utils";

export const ApplySchema = z.object({
  jobId: z.string().min(1),
  // Cap matches the Application.message column (varchar 500) and PROJECT_SPEC §2.
  message: optionalTrimmedString(500),
});

export const ListForJobSchema = z.object({
  jobId: z.string().min(1),
});

// Per-application employer actions. CLOSED is never set here — it is driven only by
// the job-close cascade (jobPosting.close). SUBMITTED is the undo-close target.
export const UpdateApplicationStatusSchema = z.object({
  id: z.string().min(1),
  status: z.enum(["SUBMITTED", "VIEWED", "REJECTED"]),
});
