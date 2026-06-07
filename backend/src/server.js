import { createApp } from "./app.js";
import { env } from "./config/env.js";
import { logger } from "./config/logger.js";
import { seedAdminFoundation } from "./modules/admin/admin.seed.js";
import {
  closeNotificationWorker,
  startNotificationWorker,
} from "./modules/notifications/notifications.worker.js";
import {
  closeNotificationQueue,
} from "./queues/notificationQueue.js";
import { closeRedisConnections } from "./queues/redisConnection.js";

// Process entry point: sync admin RBAC defaults, then start the Express API.
const app = createApp();

let server;
let isShuttingDown = false;

try {
  await seedAdminFoundation();
  startNotificationWorker();
  server = app.listen(env.port, () => {
    logger.info(
      {
        port: env.port,
        environment: env.nodeEnv,
        apiVersion: env.apiVersion,
      },
      "GoldWallah API listening",
    );
  });
} catch (error) {
  logger.error({ error }, "Failed to start GoldWallah API");
  process.exit(1);
}

async function closeBackgroundServices() {
  await Promise.allSettled([
    closeNotificationWorker(),
    closeNotificationQueue(),
    closeRedisConnections(),
  ]);
}

function shutdown(signal) {
  if (isShuttingDown) {
    return;
  }

  isShuttingDown = true;
  logger.info({ signal }, "Shutting down GoldWallah API");
  if (!server) {
    closeBackgroundServices().finally(() => process.exit(0));
    return;
  }
  server.close(async () => {
    await closeBackgroundServices();
    logger.info("HTTP server closed");
    process.exit(0);
  });
}

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
