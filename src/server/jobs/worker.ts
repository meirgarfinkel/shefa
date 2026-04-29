import "dotenv/config";
import { Worker, Queue } from "bullmq";
import { createRedisConnection } from "./redis";
import { runFreshnessCheck } from "./freshness.job";
import { FRESHNESS_QUEUE, FRESHNESS_JOB_NAME } from "./queue";

async function main() {
  const schedulerConn = createRedisConnection();
  const workerConn = createRedisConnection();

  const queue = new Queue(FRESHNESS_QUEUE, { connection: schedulerConn });

  await queue.add(
    FRESHNESS_JOB_NAME,
    {},
    {
      repeat: { pattern: "0 0 * * *" },
      jobId: "freshness-daily",
    },
  );

  const worker = new Worker(
    FRESHNESS_QUEUE,
    async (job) => {
      if (job.name === FRESHNESS_JOB_NAME) {
        console.log(`[worker] Running freshness check at ${new Date().toISOString()}`);
        await runFreshnessCheck();
        console.log("[worker] Freshness check complete");
      }
    },
    { connection: workerConn },
  );

  worker.on("completed", (job) => {
    console.log(`[worker] Job ${job.id} completed`);
  });

  worker.on("failed", (job, err) => {
    console.error(`[worker] Job ${job?.id} failed:`, err);
  });

  console.log("[worker] Started — freshness check runs daily at midnight UTC");
}

main().catch((err) => {
  console.error("[worker] Fatal error:", err);
  process.exit(1);
});
