import { createApp } from "./app.js";
import { env } from "./config/env.js";
import { logger } from "./config/logger.js";

const app = createApp();

const server = app.listen(env.port, () => {
  logger.info(
    {
      port: env.port,
      environment: env.nodeEnv,
      apiVersion: env.apiVersion,
    },
    "GoldWallah API listening",
  );
});

function shutdown(signal) {
  logger.info({ signal }, "Shutting down GoldWallah API");
  server.close(() => {
    logger.info("HTTP server closed");
    process.exit(0);
  });
}

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
