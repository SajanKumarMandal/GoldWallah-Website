import { Worker } from "bullmq";
import { z } from "zod";

import { env } from "../../config/env.js";
import { logger } from "../../config/logger.js";
import { createWorkerRedisConnection } from "../../queues/redisConnection.js";
import { notificationQueueName } from "../../queues/notificationQueue.js";
import {
  countUnreadNotifications,
  findNotificationById,
} from "./notifications.repository.js";
import { publishNotificationEvent } from "./notificationRealtime.service.js";

const notificationDeliveryJobSchema = z.object({
  notificationId: z.string().uuid(),
});

let notificationWorker;

function createMissingNotificationError(notificationId) {
  const error = new Error("Notification is not committed yet");
  error.code = "NOTIFICATION_NOT_COMMITTED";
  error.notificationId = notificationId;
  return error;
}

export function startNotificationWorker() {
  if (!env.redisUrl) {
    logger.warn("Redis is not configured; BullMQ notification worker disabled");
    return null;
  }

  if (!env.bullMqWorkerEnabled) {
    logger.info("BullMQ notification worker disabled by configuration");
    return null;
  }

  if (notificationWorker) {
    return notificationWorker;
  }

  const connection = createWorkerRedisConnection();

  notificationWorker = new Worker(
    notificationQueueName,
    async (job) => {
      const payload = notificationDeliveryJobSchema.parse(job.data);
      const notification = await findNotificationById(payload.notificationId);

      if (!notification) {
        throw createMissingNotificationError(payload.notificationId);
      }

      const unreadCount = await countUnreadNotifications(notification.userId);

      await publishNotificationEvent({
        notification,
        unreadCount,
      });

      return {
        notificationId: notification.id,
        userId: notification.userId,
      };
    },
    {
      connection,
      concurrency: env.notificationQueueConcurrency,
    },
  );

  notificationWorker.on("completed", (job) => {
    logger.debug({ jobId: job.id }, "Notification delivery job completed");
  });

  notificationWorker.on("failed", (job, error) => {
    logger.warn(
      {
        jobId: job?.id,
        attemptsMade: job?.attemptsMade,
        error,
      },
      "Notification delivery job failed",
    );
  });

  notificationWorker.on("error", (error) => {
    logger.warn({ error }, "Notification worker error");
  });

  logger.info(
    { queueName: notificationQueueName, concurrency: env.notificationQueueConcurrency },
    "BullMQ notification worker started",
  );

  return notificationWorker;
}

export async function closeNotificationWorker() {
  if (notificationWorker) {
    await notificationWorker.close();
    notificationWorker = undefined;
  }
}
