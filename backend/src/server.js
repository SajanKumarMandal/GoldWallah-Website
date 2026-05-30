import { createApp } from "./app.js";
import { env } from "./config/env.js";
import { logger } from "./config/logger.js";
import { seedAdminFoundation } from "./modules/admin/admin.seed.js";

const app = createApp();

let server;

try {
  await seedAdminFoundation();
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

function shutdown(signal) {
  logger.info({ signal }, "Shutting down GoldWallah API");
  if (!server) {
    process.exit(0);
  }
  server.close(() => {
    logger.info("HTTP server closed");
    process.exit(0);
  });
}

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
