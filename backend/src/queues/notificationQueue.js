import { Queue } from "bullmq";

import { logger } from "../config/logger.js";
import { getQueueRedisConnection } from "./redisConnection.js";

export const notificationQueueName = "goldwallah:notifications";

let notificationQueue;

export function getNotificationQueue() {
  const connection = getQueueRedisConnection();

  if (!connection) {
    return null;
  }

  if (!notificationQueue) {
    notificationQueue = new Queue(notificationQueueName, {
      connection,
      defaultJobOptions: {
        attempts: 8,
        backoff: {
          type: "exponential",
          delay: 1000,
        },
        removeOnComplete: {
          age: 60 * 60,
          count: 10000,
        },
        removeOnFail: {
          age: 24 * 60 * 60,
          count: 10000,
        },
      },
    });

    notificationQueue.on("error", (error) => {
      logger.warn({ error }, "Notification queue error");
    });
  }

  return notificationQueue;
}

export async function enqueueNotificationDelivery(notificationId) {
  const queue = getNotificationQueue();

  if (!queue) {
    logger.warn(
      { notificationId },
      "Redis is not configured; notification realtime delivery skipped",
    );
    return false;
  }

  await queue.add(
    "deliver-notification",
    { notificationId },
    {
      jobId: `notification:${notificationId}`,
      delay: 250,
    },
  );

  return true;
}

export async function closeNotificationQueue() {
  if (notificationQueue) {
    await notificationQueue.close();
    notificationQueue = undefined;
  }
}
