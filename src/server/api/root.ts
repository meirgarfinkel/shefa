import { createTRPCRouter } from "@/server/api/trpc";
import { userRouter } from "@/server/api/routers/user";
import { seekerRouter } from "@/server/api/routers/seeker";
import { employerRouter } from "@/server/api/routers/employer";

export const appRouter = createTRPCRouter({
  user: userRouter,
  seeker: seekerRouter,
  employer: employerRouter,
});

export type AppRouter = typeof appRouter;
