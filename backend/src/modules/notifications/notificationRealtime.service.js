import { randomUUID } from "node:crypto";

import { env } from "../../config/env.js";
import { logger } from "../../config/logger.js";
import {
  getPublisherRedisConnection,
  getSubscriberRedisConnection,
} from "../../queues/redisConnection.js";

const channelPrefix = "goldwallah:notifications:user:";

const clientsByUserId = new Map();
let subscriberInitialized = false;

function channelForUser(userId) {
  return `${channelPrefix}${userId}`;
}

function userIdFromChannel(channel) {
  if (!channel.startsWith(channelPrefix)) {
    return "";
  }

  return channel.slice(channelPrefix.length);
}

function sseMessage(event, data) {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

function createUnavailableError() {
  const error = new Error("Realtime notifications are unavailable");
  error.statusCode = 503;
  error.code = "REALTIME_NOTIFICATIONS_UNAVAILABLE";
  return error;
}

function ensureSubscriber() {
  const subscriber = getSubscriberRedisConnection();

  if (!subscriber) {
    return null;
  }

  if (!subscriberInitialized) {
    subscriber.on("message", (channel, message) => {
      const userId = userIdFromChannel(channel);

      if (!userId) {
        return;
      }

      let envelope;

      try {
        envelope = JSON.parse(message);
      } catch (error) {
        logger.warn({ error, userId }, "Invalid notification stream payload");
        return;
      }

      if (!envelope?.event || envelope.data === undefined) {
        logger.warn({ userId }, "Notification stream payload missing event data");
        return;
      }

      deliverToLocalUser(
        userId,
        sseMessage(envelope.event, envelope.data),
        envelope.data,
      );
    });
    subscriberInitialized = true;
  }

  return subscriber;
}

function shouldCloseClientAfterDelivery(data) {
  return data?.notification?.type === "ACCOUNT_SUSPENDED";
}

function deliverToLocalUser(userId, message, data) {
  const clients = clientsByUserId.get(userId);

  if (!clients?.size) {
    return;
  }

  for (const client of clients) {
    try {
      client.response.write(message);
      if (shouldCloseClientAfterDelivery(data)) {
        client.close();
      }
    } catch (error) {
      logger.warn({ error, userId }, "Failed to write notification stream event");
      client.close();
    }
  }
}

function addClient(userId, response) {
  const client = {
    id: randomUUID(),
    response,
    heartbeatTimer: undefined,
    close: () => {},
  };

  let clients = clientsByUserId.get(userId);

  if (!clients) {
    clients = new Set();
    clientsByUserId.set(userId, clients);
  }

  clients.add(client);

  client.close = () => {
    if (client.heartbeatTimer) {
      clearInterval(client.heartbeatTimer);
    }

    clients.delete(client);

    if (clients.size === 0) {
      clientsByUserId.delete(userId);
      const subscriber = ensureSubscriber();

      if (subscriber) {
        subscriber.unsubscribe(channelForUser(userId)).catch((error) => {
          logger.warn({ error, userId }, "Failed to unsubscribe notification stream");
        });
      }
    }
  };

  return client;
}

export async function openNotificationStream({ request, response, user }) {
  const subscriber = ensureSubscriber();

  if (!subscriber) {
    throw createUnavailableError();
  }

  const userId = user.id;
  const hasExistingClients = Boolean(clientsByUserId.get(userId)?.size);
  const client = addClient(userId, response);

  try {
    if (!hasExistingClients) {
      await subscriber.subscribe(channelForUser(userId));
    }
  } catch (error) {
    client.close();
    logger.warn({ error, userId }, "Failed to subscribe notification stream");
    throw createUnavailableError();
  }

  response.writeHead(200, {
    "Content-Type": "text/event-stream; charset=utf-8",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  });
  response.write(
    sseMessage("connected", {
      userId,
      heartbeatMs: env.notificationStreamHeartbeatMs,
    }),
  );

  client.heartbeatTimer = setInterval(() => {
    try {
      response.write(
        sseMessage("heartbeat", {
          now: new Date().toISOString(),
        }),
      );
    } catch (error) {
      logger.warn({ error, userId }, "Failed to write notification heartbeat");
      client.close();
    }
  }, env.notificationStreamHeartbeatMs);

  request.on("close", client.close);
}

export async function publishNotificationEvent({ notification, unreadCount }) {
  const publisher = getPublisherRedisConnection();

  if (!publisher) {
    throw createUnavailableError();
  }

  const message = JSON.stringify({
    event: "notification.created",
    data: {
      notification,
      unreadCount,
    },
  });

  await publisher.publish(channelForUser(notification.userId), message);
}
