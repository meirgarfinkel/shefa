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

export const APPLICATION_NOTIFY_QUEUE = "application-notify";
export const APPLICATION_NOTIFY_JOB_NAME = "send-application-notify";

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

export const DAILY_DIGEST_QUEUE = "daily-digest";
export const DAILY_DIGEST_JOB_NAME = "run-daily-digest";

let _dailyDigestQueue: Queue | undefined;

export function getDailyDigestQueue(): Queue {
  if (!_dailyDigestQueue) {
    _dailyDigestQueue = new Queue(DAILY_DIGEST_QUEUE, {
      connection: createRedisConnection(),
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: "exponential", delay: 5000 },
        removeOnComplete: 100,
        removeOnFail: 200,
      },
    });
  }
  return _dailyDigestQueue;
}

export const RESPONSIVENESS_QUEUE = "responsiveness-check";
export const RESPONSIVENESS_JOB_NAME = "run-responsiveness-check";

let _responsivenessQueue: Queue | undefined;

export function getResponsivenessQueue(): Queue {
  if (!_responsivenessQueue) {
    _responsivenessQueue = new Queue(RESPONSIVENESS_QUEUE, {
      connection: createRedisConnection(),
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: "exponential", delay: 5000 },
        removeOnComplete: 100,
        removeOnFail: 200,
      },
    });
  }
  return _responsivenessQueue;
}

let _applicationNotifyQueue: Queue | undefined;

export function getApplicationNotifyQueue(): Queue {
  if (!_applicationNotifyQueue) {
    _applicationNotifyQueue = new Queue(APPLICATION_NOTIFY_QUEUE, {
      connection: createRedisConnection(),
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: "exponential", delay: 5000 },
        removeOnComplete: 100,
        removeOnFail: 200,
      },
    });
  }
  return _applicationNotifyQueue;
}
