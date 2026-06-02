import { query } from "../../config/db.js";

function clampLimit(limit) {
  const parsedLimit = Number(limit);

  if (!Number.isInteger(parsedLimit) || parsedLimit <= 0) {
    return 50;
  }

  return Math.min(parsedLimit, 100);
}

function mapAuditLog(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    source: row.source,
    actorAdminId: row.actor_admin_id,
    actorAdminName: row.actor_admin_name,
    actorAdminEmail: row.actor_admin_email,
    actorUserId: row.actor_user_id,
    actorUserName: row.actor_user_name,
    actorUserEmail: row.actor_user_email,
    action: row.action,
    resourceType: row.resource_type,
    resourceId: row.resource_id,
    reason: row.reason,
    ipAddress: row.ip_address,
    userAgent: row.user_agent,
    requestId: row.request_id,
    severity: row.severity,
    createdAt: row.created_at,
  };
}

function addFilter(filters, clauses, params) {
  if (filters.severities?.length) {
    params.push(filters.severities);
    clauses.push(`events.severity = ANY($${params.length})`);
  } else if (filters.severity) {
    params.push(filters.severity);
    clauses.push(`events.severity = $${params.length}`);
  }

  if (filters.action) {
    params.push(filters.action);
    clauses.push(`events.action = $${params.length}`);
  }

  if (filters.resourceType) {
    params.push(filters.resourceType);
    clauses.push(`events.resource_type = $${params.length}`);
  }

  if (filters.actorAdminId) {
    params.push(filters.actorAdminId);
    clauses.push(`events.actor_admin_id = $${params.length}`);
  }

  if (filters.actorUserId) {
    params.push(filters.actorUserId);
    clauses.push(`events.actor_user_id = $${params.length}`);
  }

  if (filters.source) {
    params.push(filters.source);
    clauses.push(`events.source = $${params.length}`);
  }

  if (filters.from) {
    params.push(filters.from);
    clauses.push(`events.created_at >= $${params.length}::timestamptz`);
  }

  if (filters.to) {
    params.push(filters.to);
    clauses.push(`events.created_at <= $${params.length}::timestamptz`);
  }

  if (filters.cursor?.createdAt && filters.cursor?.id) {
    params.push(filters.cursor.createdAt, filters.cursor.id);
    clauses.push(
      `(events.created_at, events.id) < ($${params.length - 1}::timestamptz, $${params.length}::uuid)`,
    );
  }
}

export async function listAdminAuditLogs(filters = {}) {
  const safeLimit = clampLimit(filters.limit);
  const params = [];
  const clauses = [];

  addFilter(filters, clauses, params);

  params.push(safeLimit + 1);
  const result = await query(
    `WITH events AS (
       SELECT
         aal.id,
         'ADMIN'::text AS source,
         aal.actor_admin_id,
         au.name AS actor_admin_name,
         au.email AS actor_admin_email,
         NULL::uuid AS actor_user_id,
         NULL::varchar AS actor_user_name,
         NULL::varchar AS actor_user_email,
         aal.action,
         aal.resource_type,
         aal.resource_id,
         aal.reason,
         aal.ip_address,
         aal.user_agent,
         aal.request_id,
         aal.severity,
         aal.created_at
       FROM admin_audit_logs aal
       LEFT JOIN admin_users au ON au.id = aal.actor_admin_id

       UNION ALL

       SELECT
         al.id,
         'USER'::text AS source,
         al.actor_admin_id,
         au.name AS actor_admin_name,
         au.email AS actor_admin_email,
         al.actor_user_id,
         u.full_name AS actor_user_name,
         u.email AS actor_user_email,
         al.action,
         al.entity_type AS resource_type,
         al.entity_id,
         NULL::text AS reason,
         al.ip_address,
         al.user_agent,
         NULL::varchar AS request_id,
         CASE
           WHEN al.action ILIKE '%PAYMENT%'
             OR al.action ILIKE '%VERIFICATION%'
             OR al.action ILIKE '%COMMISSION%'
           THEN 'WARNING'
           ELSE 'INFO'
         END AS severity,
         al.created_at
       FROM audit_logs al
       LEFT JOIN admin_users au ON au.id = al.actor_admin_id
       LEFT JOIN users u ON u.id = al.actor_user_id
     )
     SELECT *
     FROM events
     ${clauses.length ? `WHERE ${clauses.join(" AND ")}` : ""}
     ORDER BY events.created_at DESC, events.id DESC
     LIMIT $${params.length}`,
    params,
  );

  const rows = result.rows.slice(0, safeLimit);
  const hasMore = result.rows.length > safeLimit;

  return {
    logs: rows.map(mapAuditLog),
    hasMore,
    nextCursor: hasMore ? rows[rows.length - 1] : null,
  };
}
