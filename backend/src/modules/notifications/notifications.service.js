import {
  countUnreadNotifications,
  createNotification,
  listUserNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "./notifications.repository.js";

// Durable user notifications for bid and marketplace events. Messages are
// intentionally generic so they do not leak private bid amounts.
function createError(message, statusCode, code) {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.code = code;
  return error;
}

export async function notifyUser(data, client) {
  return createNotification(data, client);
}

export async function getMyNotifications({ user, query }) {
  const notifications = await listUserNotifications({
    userId: user.id,
    unreadOnly: query.unreadOnly,
    limit: query.limit,
  });

  return {
    success: true,
    data: {
      unreadCount: await countUnreadNotifications(user.id),
      notifications,
    },
  };
}

export async function readNotification({ user, notificationId }) {
  const notification = await markNotificationRead({
    userId: user.id,
    notificationId,
  });

  if (!notification) {
    throw createError("Notification not found", 404, "NOTIFICATION_NOT_FOUND");
  }

  return {
    success: true,
    data: notification,
  };
}

export async function readAllNotifications(user) {
  return {
    success: true,
    data: await markAllNotificationsRead(user.id),
  };
}
