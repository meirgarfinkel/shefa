import { createTRPCRouter } from "@/server/api/trpc";
import { userRouter } from "@/server/api/routers/user";
import { seekerRouter } from "@/server/api/routers/seeker";
import { employerRouter } from "@/server/api/routers/employer";
import { businessRouter } from "@/server/api/routers/business";
import { taxonomyRouter } from "@/server/api/routers/taxonomy";
import { jobPostingRouter } from "@/server/api/routers/jobPosting";
import { applicationRouter } from "@/server/api/routers/application";
import { conversationRouter } from "@/server/api/routers/conversation";
import { messageRouter } from "@/server/api/routers/message";
import { notificationRouter } from "@/server/api/routers/notification";
import { reportRouter } from "@/server/api/routers/report";
import { locationRouter } from "@/server/api/routers/location";
import { adminRouter } from "@/server/api/routers/admin";
import { feedbackRouter } from "@/server/api/routers/feedback";

export const appRouter = createTRPCRouter({
  admin: adminRouter,
  feedback: feedbackRouter,
  user: userRouter,
  seeker: seekerRouter,
  employer: employerRouter,
  business: businessRouter,
  taxonomy: taxonomyRouter,
  jobPosting: jobPostingRouter,
  application: applicationRouter,
  conversation: conversationRouter,
  message: messageRouter,
  notification: notificationRouter,
  report: reportRouter,
  location: locationRouter,
});

export type AppRouter = typeof appRouter;
