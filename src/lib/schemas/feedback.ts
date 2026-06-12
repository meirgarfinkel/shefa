import { z } from "zod";
import { requiredTrimmedString } from "@/lib/utils";

export const FeedbackCategoryEnum = z.enum(["BUG", "IMPROVEMENT", "THANKS", "OTHER"]);
export const FeedbackStatusEnum = z.enum(["OPEN", "REVIEWED", "RESOLVED"]);

export const SubmitFeedbackSchema = z.object({
  category: FeedbackCategoryEnum,
  message: requiredTrimmedString(2000),
});

export const UpdateFeedbackStatusSchema = z.object({
  id: z.string().min(1),
  status: FeedbackStatusEnum,
});

export type SubmitFeedbackInput = z.infer<typeof SubmitFeedbackSchema>;
export type UpdateFeedbackStatusInput = z.infer<typeof UpdateFeedbackStatusSchema>;
