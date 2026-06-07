import rateLimit from "express-rate-limit";
import { RedisStore } from "rate-limit-redis";

import { env } from "../config/env.js";
import { getRateLimitRedisConnection } from "../queues/redisConnection.js";

function buildRedisStore(name) {
  const client = getRateLimitRedisConnection();

  if (!client) {
    return undefined;
  }

  return new RedisStore({
    prefix: `goldwallah:rl:${name}:`,
    sendCommand: (command, ...args) => client.call(command, ...args),
  });
}

export function createRateLimiter({ name, ...options }) {
  const store = buildRedisStore(name);

  if (env.isProduction && !store) {
    throw new Error(`Redis store is required for production rate limiter: ${name}`);
  }

  return rateLimit({
    standardHeaders: true,
    legacyHeaders: false,
    passOnStoreError: false,
    ...options,
    store,
  });
}

export const apiRateLimiter = createRateLimiter({
  name: "api",
  windowMs: 15 * 60 * 1000,
  limit: 3000,
  message: {
    error: {
      message: "Too many requests. Please try again later.",
      code: "API_RATE_LIMITED",
    },
  },
});
