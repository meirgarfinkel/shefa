import "server-only";
import { headers } from "next/headers";
import { cache } from "react";
import { createCallerFactory, createTRPCContext } from "@/server/api/trpc";
import { appRouter } from "@/server/api/root";

/**
 * Server-side tRPC caller for use in React Server Components (e.g. building
 * `generateMetadata` + JobPosting JSON-LD on the public job page). Reuses the real
 * request context — same session and visibility rules as an HTTP call, no duplicated
 * authorization logic.
 */
export const createServerCaller = cache(async () => {
  const ctx = await createTRPCContext({ headers: await headers() });
  return createCallerFactory(appRouter)(ctx);
});
