import { randomUUID } from "node:crypto";

import { query } from "../../config/db.js";

function db(client) {
  return client || { query };
}

function mapNotification(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    userId: row.user_id,
    type: row.type,
    title: row.title,
    body: row.body,
    entityType: row.entity_type,
    entityId: row.entity_id,
    readAt: row.read_at,
    createdAt: row.created_at,
  };
}

export async function createNotification(data, client) {
  const result = await db(client).query(
    `INSERT INTO notifications (
      id,
      user_id,
      type,
      title,
      body,
      entity_type,
      entity_id
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING *`,
    [
      randomUUID(),
      data.userId,
      data.type,
      data.title,
      data.body,
      data.entityType ?? null,
      data.entityId ?? null,
    ],
  );

  return mapNotification(result.rows[0]);
}

export async function listUserNotifications({ userId, unreadOnly, limit }, client) {
  const safeLimit = Math.min(Math.max(Number(limit) || 20, 1), 50);
  const params = [userId, safeLimit];
  const unreadFilter = unreadOnly ? "AND read_at IS NULL" : "";
  const result = await db(client).query(
    `SELECT *
     FROM notifications
     WHERE user_id = $1
       ${unreadFilter}
     ORDER BY created_at DESC
     LIMIT $2`,
    params,
  );

  return result.rows.map(mapNotification);
}

export async function markNotificationRead({ userId, notificationId }, client) {
  const result = await db(client).query(
    `UPDATE notifications
     SET read_at = COALESCE(read_at, now())
     WHERE id = $1
       AND user_id = $2
     RETURNING *`,
    [notificationId, userId],
  );

  return mapNotification(result.rows[0]);
}

export async function markAllNotificationsRead(userId, client) {
  const result = await db(client).query(
    `UPDATE notifications
     SET read_at = COALESCE(read_at, now())
     WHERE user_id = $1
       AND read_at IS NULL
     RETURNING *`,
    [userId],
  );

  return result.rows.map(mapNotification);
}

export async function countUnreadNotifications(userId, client) {
  const result = await db(client).query(
    `SELECT COUNT(*)::int AS count
     FROM notifications
     WHERE user_id = $1
       AND read_at IS NULL`,
    [userId],
  );

  return result.rows[0]?.count || 0;
}
