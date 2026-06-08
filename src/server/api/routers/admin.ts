import { z } from "zod";
import { eq, desc, inArray } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, adminProcedure } from "@/server/api/trpc";
import { report, users, jobPosting, message, seekerProfile, employerProfile } from "@/db/schema";

const ReportStatus = z.enum(["OPEN", "REVIEWED", "ACTIONED", "DISMISSED"]);

export const adminRouter = createTRPCRouter({
  // Moderation queue. Defaults to OPEN reports, newest first, with resolved targets.
  listReports: adminProcedure
    .input(z.object({ status: ReportStatus.optional() }).optional())
    .query(async ({ ctx, input }) => {
      const rows = await ctx.db.query.report.findMany({
        where: input?.status ? eq(report.status, input.status) : undefined,
        orderBy: desc(report.createdAt),
        limit: 200,
      });

      // Resolve targets in bulk per type to avoid per-row round trips.
      const userIds = rows.filter((r) => r.targetType === "USER").map((r) => r.targetId);
      const jobIds = rows.filter((r) => r.targetType === "JOB").map((r) => r.targetId);
      const msgIds = rows.filter((r) => r.targetType === "MESSAGE").map((r) => r.targetId);

      const [targetUsers, targetJobs, targetMsgs, seekerStatuses, employerStatuses] =
        await Promise.all([
          userIds.length
            ? ctx.db.query.users.findMany({
                where: inArray(users.id, userIds),
                columns: { id: true, name: true, email: true },
              })
            : [],
          jobIds.length
            ? ctx.db.query.jobPosting.findMany({
                where: inArray(jobPosting.id, jobIds),
                columns: { id: true, title: true, status: true, employerId: true },
              })
            : [],
          msgIds.length
            ? ctx.db.query.message.findMany({
                where: inArray(message.id, msgIds),
                columns: { id: true, body: true, senderId: true, conversationId: true },
              })
            : [],
          userIds.length
            ? ctx.db.query.seekerProfile.findMany({
                where: inArray(seekerProfile.userId, userIds),
                columns: { userId: true, status: true },
              })
            : [],
          userIds.length
            ? ctx.db.query.employerProfile.findMany({
                where: inArray(employerProfile.userId, userIds),
                columns: { userId: true, status: true },
              })
            : [],
        ]);

      const suspended = new Set(
        [...seekerStatuses, ...employerStatuses]
          .filter((p) => p.status === "SUSPENDED")
          .map((p) => p.userId),
      );
      const userMap = new Map(targetUsers.map((u) => [u.id, u]));
      const jobMap = new Map(targetJobs.map((j) => [j.id, j]));
      const msgMap = new Map(targetMsgs.map((m) => [m.id, m]));

      return rows.map((r) => ({
        ...r,
        target:
          r.targetType === "USER"
            ? {
                type: "USER" as const,
                user: userMap.get(r.targetId) ?? null,
                suspended: suspended.has(r.targetId),
              }
            : r.targetType === "JOB"
              ? { type: "JOB" as const, job: jobMap.get(r.targetId) ?? null }
              : { type: "MESSAGE" as const, message: msgMap.get(r.targetId) ?? null },
      }));
    }),

  updateReportStatus: adminProcedure
    .input(z.object({ reportId: z.string().min(1), status: ReportStatus }))
    .mutation(async ({ ctx, input }) => {
      const [updated] = await ctx.db
        .update(report)
        .set({ status: input.status })
        .where(eq(report.id, input.reportId))
        .returning();
      if (!updated) throw new TRPCError({ code: "NOT_FOUND" });
      return updated;
    }),

  // Soft moderation: flip the target user's profile status. Reversible; deletes nothing.
  setUserSuspension: adminProcedure
    .input(z.object({ userId: z.string().min(1), suspended: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      if (input.userId === ctx.user.id) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Cannot suspend yourself" });
      }
      const target = await ctx.db.query.users.findFirst({
        where: eq(users.id, input.userId),
        columns: { id: true, role: true },
      });
      if (!target) throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
      if (target.role === "ADMIN") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Cannot suspend an admin" });
      }

      const status = input.suspended ? "SUSPENDED" : "ACTIVE";
      // A user has at most one role profile; update whichever exists.
      await Promise.all([
        ctx.db.update(seekerProfile).set({ status }).where(eq(seekerProfile.userId, input.userId)),
        ctx.db
          .update(employerProfile)
          .set({ status })
          .where(eq(employerProfile.userId, input.userId)),
      ]);

      return { userId: input.userId, suspended: input.suspended };
    }),
});
