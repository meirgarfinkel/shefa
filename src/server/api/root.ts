import { createTRPCRouter } from "@/server/api/trpc";
import { userRouter } from "@/server/api/routers/user";
import { seekerRouter } from "@/server/api/routers/seeker";
import { employerRouter } from "@/server/api/routers/employer";
import { taxonomyRouter } from "@/server/api/routers/taxonomy";
import { jobPostingRouter } from "@/server/api/routers/jobPosting";
import { applicationRouter } from "@/server/api/routers/application";
import { notificationRouter } from "@/server/api/routers/notification";

export const appRouter = createTRPCRouter({
  user: userRouter,
  seeker: seekerRouter,
  employer: employerRouter,
  taxonomy: taxonomyRouter,
  jobPosting: jobPostingRouter,
  application: applicationRouter,
  notification: notificationRouter,
});

export type AppRouter = typeof appRouter;
