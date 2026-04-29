import { Queue } from "bullmq";
import { createRedisConnection } from "./redis";

export const FRESHNESS_QUEUE = "freshness-check";
export const FRESHNESS_JOB_NAME = "run-freshness-check";

let _queue: Queue | undefined;

export function getFreshnessQueue(): Queue {
  if (!_queue) {
    _queue = new Queue(FRESHNESS_QUEUE, {
      connection: createRedisConnection(),
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: "exponential", delay: 5000 },
        removeOnComplete: 100,
        removeOnFail: 200,
      },
    });
  }
  return _queue;
}
