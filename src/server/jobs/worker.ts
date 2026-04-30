import "dotenv/config";
import { Worker, Queue } from "bullmq";
import { createRedisConnection } from "./redis";
import { runFreshnessCheck } from "./freshness.job";
import { runMessageNotifyJob } from "./message-notify.job";
import { runApplicationNotifyJob } from "./application-notify.job";
import { runDailyDigestJob } from "./daily-digest.job";
import {
  FRESHNESS_QUEUE,
  FRESHNESS_JOB_NAME,
  MESSAGE_NOTIFY_QUEUE,
  MESSAGE_NOTIFY_JOB_NAME,
  APPLICATION_NOTIFY_QUEUE,
  APPLICATION_NOTIFY_JOB_NAME,
  DAILY_DIGEST_QUEUE,
  DAILY_DIGEST_JOB_NAME,
} from "./queue";

async function main() {
  const freshnessSchedulerConn = createRedisConnection();
  const freshnessWorkerConn = createRedisConnection();
  const dailyDigestSchedulerConn = createRedisConnection();
  const dailyDigestWorkerConn = createRedisConnection();
  const messageNotifyWorkerConn = createRedisConnection();

  const freshnessQueue = new Queue(FRESHNESS_QUEUE, { connection: freshnessSchedulerConn });
  const dailyDigestQueue = new Queue(DAILY_DIGEST_QUEUE, { connection: dailyDigestSchedulerConn });

  await freshnessQueue.add(
    FRESHNESS_JOB_NAME,
    {},
    {
      repeat: { pattern: "0 0 * * *" },
      jobId: "freshness-daily",
    },
  );

  await dailyDigestQueue.add(
    DAILY_DIGEST_JOB_NAME,
    {},
    {
      repeat: { pattern: "0 0 * * *" },
      jobId: "daily-digest-daily",
    },
  );

  const freshnessWorker = new Worker(
    FRESHNESS_QUEUE,
    async (job) => {
      if (job.name === FRESHNESS_JOB_NAME) {
        console.log(`[worker] Running freshness check at ${new Date().toISOString()}`);
        await runFreshnessCheck();
        console.log("[worker] Freshness check complete");
      }
    },
    { connection: freshnessWorkerConn },
  );

  freshnessWorker.on("completed", (job) => {
    console.log(`[worker] Freshness job ${job.id} completed`);
  });

  freshnessWorker.on("failed", (job, err) => {
    console.error(`[worker] Freshness job ${job?.id} failed:`, err);
  });

  const messageNotifyWorker = new Worker(
    MESSAGE_NOTIFY_QUEUE,
    async (job) => {
      if (job.name === MESSAGE_NOTIFY_JOB_NAME) {
        console.log(`[worker] Running message notify for job ${job.id}`);
        await runMessageNotifyJob(job.data as { conversationId: string; recipientId: string });
        console.log(`[worker] Message notify complete for job ${job.id}`);
      }
    },
    { connection: messageNotifyWorkerConn },
  );

  messageNotifyWorker.on("completed", (job) => {
    console.log(`[worker] Message notify job ${job.id} completed`);
  });

  messageNotifyWorker.on("failed", (job, err) => {
    console.error(`[worker] Message notify job ${job?.id} failed:`, err);
  });

  const applicationNotifyWorkerConn = createRedisConnection();

  const applicationNotifyWorker = new Worker(
    APPLICATION_NOTIFY_QUEUE,
    async (job) => {
      if (job.name === APPLICATION_NOTIFY_JOB_NAME) {
        console.log(`[worker] Running application notify for job ${job.id}`);
        await runApplicationNotifyJob(job.data as { jobId: string; employerId: string });
        console.log(`[worker] Application notify complete for job ${job.id}`);
      }
    },
    { connection: applicationNotifyWorkerConn },
  );

  applicationNotifyWorker.on("completed", (job) => {
    console.log(`[worker] Application notify job ${job.id} completed`);
  });

  applicationNotifyWorker.on("failed", (job, err) => {
    console.error(`[worker] Application notify job ${job?.id} failed:`, err);
  });

  const dailyDigestWorker = new Worker(
    DAILY_DIGEST_QUEUE,
    async (job) => {
      if (job.name === DAILY_DIGEST_JOB_NAME) {
        console.log(`[worker] Running daily digest at ${new Date().toISOString()}`);
        await runDailyDigestJob();
        console.log("[worker] Daily digest complete");
      }
    },
    { connection: dailyDigestWorkerConn },
  );

  dailyDigestWorker.on("completed", (job) => {
    console.log(`[worker] Daily digest job ${job.id} completed`);
  });

  dailyDigestWorker.on("failed", (job, err) => {
    console.error(`[worker] Daily digest job ${job?.id} failed:`, err);
  });

  console.log(
    "[worker] Started — freshness (daily) + message notify (on demand) + application notify (on demand) + daily digest (daily)",
  );
}

main().catch((err) => {
  console.error("[worker] Fatal error:", err);
  process.exit(1);
});
