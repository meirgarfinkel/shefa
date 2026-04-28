import { createTRPCRouter } from "@/server/api/trpc";
import { userRouter } from "@/server/api/routers/user";
import { seekerRouter } from "@/server/api/routers/seeker";
import { employerRouter } from "@/server/api/routers/employer";
import { taxonomyRouter } from "@/server/api/routers/taxonomy";
import { jobPostingRouter } from "@/server/api/routers/jobPosting";

export const appRouter = createTRPCRouter({
  user: userRouter,
  seeker: seekerRouter,
  employer: employerRouter,
  taxonomy: taxonomyRouter,
  jobPosting: jobPostingRouter,
});

export type AppRouter = typeof appRouter;
