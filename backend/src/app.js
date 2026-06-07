import express from "express";

import { query } from "./config/db.js";
import { env } from "./config/env.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { notFoundHandler } from "./middleware/notFoundHandler.js";
import { requestContext } from "./middleware/requestContext.js";
import { requestLogger } from "./middleware/requestLogger.js";
import { apiRateLimiter } from "./middleware/rateLimiter.js";
import { securityMiddleware } from "./middleware/security.js";
import { apiRouter } from "./routes/apiRouter.js";
import { listingUploadsDir } from "./modules/listings/listings.upload.js";
import { pingRedis } from "./queues/redisConnection.js";
import { isLocalUploadStorage } from "./storage/uploadStorageProvider.js";

// Builds the Express app with security middleware, JSON parsing, public listing
// media, API routes, and final error handling. KYC/business documents are not
// exposed through static middleware.
export function createApp() {
  const app = express();
  app.locals.apiVersion = env.apiVersion;

  app.set("trust proxy", 1);
  app.disable("x-powered-by");
  app.use(requestContext);
  app.use(requestLogger);
  app.use(securityMiddleware);
  app.use(express.json({ limit: "1mb" }));
  app.use(express.urlencoded({ extended: false, limit: "1mb" }));

  app.get("/health", (_request, response) => {
    response.status(200).json({
      status: "ok",
      service: "goldwallah-api",
      environment: env.nodeEnv,
    });
  });

  app.get("/health/ready", async (_request, response, next) => {
    try {
      await query("SELECT 1");
      let redis;

      try {
        redis = await pingRedis();
      } catch {
        redis = {
          configured: Boolean(env.redisUrl),
          ready: false,
        };
      }

      const isRedisReady = env.redisUrl ? redis.ready : !env.isProduction;

      response.status(isRedisReady ? 200 : 503).json({
        status: isRedisReady ? "ready" : "degraded",
        service: "goldwallah-api",
        dependencies: {
          postgres: "ready",
          redis: redis.ready ? "ready" : redis.configured ? "unavailable" : "not_configured",
        },
      });
    } catch (error) {
      next(error);
    }
  });

  if (isLocalUploadStorage) {
    app.use(
      // Listing images are allowed to be public. Identity/business documents are
      // intentionally served only by authenticated media endpoints.
      "/uploads/listings",
      express.static(listingUploadsDir, {
        dotfiles: "deny",
        fallthrough: false,
        index: false,
        redirect: false,
      }),
    );
  }

  app.use(`/api/${env.apiVersion}`, apiRateLimiter, apiRouter);
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
