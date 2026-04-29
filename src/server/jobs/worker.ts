import "dotenv/config";
import { Worker, Queue } from "bullmq";
import { createRedisConnection } from "./redis";
import { runFreshnessCheck } from "./freshness.job";
import { runMessageNotifyJob } from "./message-notify.job";
import {
  FRESHNESS_QUEUE,
  FRESHNESS_JOB_NAME,
  MESSAGE_NOTIFY_QUEUE,
  MESSAGE_NOTIFY_JOB_NAME,
} from "./queue";

async function main() {
  const freshnessSchedulerConn = createRedisConnection();
  const freshnessWorkerConn = createRedisConnection();
  const messageNotifyWorkerConn = createRedisConnection();

  const freshnessQueue = new Queue(FRESHNESS_QUEUE, { connection: freshnessSchedulerConn });

  await freshnessQueue.add(
    FRESHNESS_JOB_NAME,
    {},
    {
      repeat: { pattern: "0 0 * * *" },
      jobId: "freshness-daily",
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

  console.log(
    "[worker] Started — freshness check (daily midnight UTC) + message notify (on demand)",
  );
}

main().catch((err) => {
  console.error("[worker] Fatal error:", err);
  process.exit(1);
});
