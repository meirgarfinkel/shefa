import { createTRPCRouter } from "@/server/api/trpc";
import { userRouter } from "@/server/api/routers/user";
import { seekerRouter } from "@/server/api/routers/seeker";
import { employerRouter } from "@/server/api/routers/employer";
import { taxonomyRouter } from "@/server/api/routers/taxonomy";
import { jobPostingRouter } from "@/server/api/routers/jobPosting";
import { applicationRouter } from "@/server/api/routers/application";
import { conversationRouter } from "@/server/api/routers/conversation";
import { messageRouter } from "@/server/api/routers/message";
import { notificationRouter } from "@/server/api/routers/notification";
import { reportRouter } from "@/server/api/routers/report";
import { locationRouter } from "@/server/api/routers/location";

export const appRouter = createTRPCRouter({
  user: userRouter,
  seeker: seekerRouter,
  employer: employerRouter,
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
