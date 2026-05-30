import express from "express";

import { env } from "./config/env.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { notFoundHandler } from "./middleware/notFoundHandler.js";
import { requestContext } from "./middleware/requestContext.js";
import { requestLogger } from "./middleware/requestLogger.js";
import { securityMiddleware } from "./middleware/security.js";
import { apiRouter } from "./routes/apiRouter.js";
import { listingUploadsDir } from "./modules/listings/listings.upload.js";

export function createApp() {
  const app = express();
  app.locals.apiVersion = env.apiVersion;

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

  app.use(
    "/uploads/listings",
    express.static(listingUploadsDir, {
      dotfiles: "deny",
      fallthrough: false,
      index: false,
      redirect: false,
    }),
  );

  app.use(`/api/${env.apiVersion}`, apiRouter);
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
