import { Queue } from "bullmq";
import { createRedisConnection } from "./redis";

export const FRESHNESS_QUEUE = "freshness-check";
export const FRESHNESS_JOB_NAME = "run-freshness-check";

let _freshnessQueue: Queue | undefined;

export function getFreshnessQueue(): Queue {
  if (!_freshnessQueue) {
    _freshnessQueue = new Queue(FRESHNESS_QUEUE, {
      connection: createRedisConnection(),
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: "exponential", delay: 5000 },
        removeOnComplete: 100,
        removeOnFail: 200,
      },
    });
  }
  return _freshnessQueue;
}

export const MESSAGE_NOTIFY_QUEUE = "message-notify";
export const MESSAGE_NOTIFY_JOB_NAME = "send-message-notify";

let _messageNotifyQueue: Queue | undefined;

export function getMessageNotifyQueue(): Queue {
  if (!_messageNotifyQueue) {
    _messageNotifyQueue = new Queue(MESSAGE_NOTIFY_QUEUE, {
      connection: createRedisConnection(),
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: "exponential", delay: 5000 },
        removeOnComplete: 100,
        removeOnFail: 200,
      },
    });
  }
  return _messageNotifyQueue;
}
