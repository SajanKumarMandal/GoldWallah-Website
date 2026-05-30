import {
  getMyNotifications,
  readAllNotifications,
  readNotification,
} from "./notifications.service.js";
import {
  notificationParamSchema,
  notificationQuerySchema,
  validateParams,
  validateQuery,
} from "./notifications.validation.js";

export async function myNotifications(request, response, next) {
  try {
    const query = validateQuery(notificationQuerySchema, request.query);
    response.status(200).json(
      await getMyNotifications({
        user: request.user,
        query,
      }),
    );
  } catch (error) {
    next(error);
  }
}

export async function markRead(request, response, next) {
  try {
    const { notificationId } = validateParams(
      notificationParamSchema,
      request.params,
    );
    response.status(200).json(
      await readNotification({
        user: request.user,
        notificationId,
      }),
    );
  } catch (error) {
    next(error);
  }
}

export async function markAllRead(request, response, next) {
  try {
    response.status(200).json(await readAllNotifications(request.user));
  } catch (error) {
    next(error);
  }
}
