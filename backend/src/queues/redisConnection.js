import IORedis from "ioredis";

import { env } from "../config/env.js";
import { logger } from "../config/logger.js";

let queueConnection;
let publisherConnection;
let subscriberConnection;
let rateLimitConnection;

function createConnection(role, options = {}) {
  if (!env.redisUrl) {
    return null;
  }

  const connection = new IORedis(env.redisUrl, {
    connectTimeout: 5000,
    enableReadyCheck: false,
    connectionName: `goldwallah-${role}`,
    ...options,
  });

  connection.on("error", (error) => {
    logger.warn({ error, role }, "Redis connection error");
  });

  return connection;
}

export function getQueueRedisConnection() {
  if (!queueConnection) {
    queueConnection = createConnection("queue", {
      maxRetriesPerRequest: 1,
    });
  }

  return queueConnection;
}

export function createWorkerRedisConnection() {
  return createConnection("worker", {
    maxRetriesPerRequest: null,
  });
}

export function getPublisherRedisConnection() {
  if (!publisherConnection) {
    publisherConnection = createConnection("publisher", {
      maxRetriesPerRequest: 1,
    });
  }

  return publisherConnection;
}

export function getSubscriberRedisConnection() {
  if (!subscriberConnection) {
    subscriberConnection = createConnection("subscriber", {
      maxRetriesPerRequest: null,
    });
  }

  return subscriberConnection;
}

export function getRateLimitRedisConnection() {
  if (!rateLimitConnection) {
    rateLimitConnection = createConnection("rate-limit", {
      maxRetriesPerRequest: 1,
    });
  }

  return rateLimitConnection;
}

export async function closeRedisConnections() {
  const connections = [
    queueConnection,
    publisherConnection,
    subscriberConnection,
    rateLimitConnection,
  ].filter(Boolean);

  await Promise.allSettled(connections.map((connection) => connection.quit()));
  queueConnection = undefined;
  publisherConnection = undefined;
  subscriberConnection = undefined;
  rateLimitConnection = undefined;
}

export async function pingRedis() {
  const connection = getQueueRedisConnection();

  if (!connection) {
    return {
      configured: false,
      ready: false,
    };
  }

  const pong = await connection.ping();

  return {
    configured: true,
    ready: pong === "PONG",
  };
}
