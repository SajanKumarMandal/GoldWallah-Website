import { randomUUID } from "node:crypto";

import { query } from "../../config/db.js";

function db(client) {
  return client || { query };
}

function mapAdminUser(row, { includeSensitive = false } = {}) {
  if (!row) {
    return null;
  }

  const admin = {
    id: row.id,
    name: row.name,
    email: row.email,
    status: row.status,
    isSuperAdmin: row.is_super_admin,
    mfaEnabled: row.mfa_enabled,
    lastLoginAt: row.last_login_at,
    lastLoginIp: row.last_login_ip,
    failedLoginAttempts: row.failed_login_attempts,
    lockedUntil: row.locked_until,
    passwordChangedAt: row.password_changed_at,
    mustChangePassword: row.must_change_password,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };

  if (includeSensitive) {
    admin.passwordHash = row.password_hash;
    admin.mfaSecretEncrypted = row.mfa_secret_encrypted;
  }

  return admin;
}

function mapRole(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    name: row.name,
    description: row.description,
    isSystemRole: row.is_system_role,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapSession(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    adminUserId: row.admin_user_id,
    refreshTokenHash: row.refresh_token_hash,
    ipAddress: row.ip_address,
    userAgent: row.user_agent,
    expiresAt: row.expires_at,
    revokedAt: row.revoked_at,
    createdAt: row.created_at,
  };
}

export async function countAdminUsers(client) {
  const result = await db(client).query("SELECT COUNT(*)::int AS count FROM admin_users");
  return result.rows[0]?.count || 0;
}

export async function findAdminByEmail(email, client) {
  const result = await db(client).query(
    "SELECT * FROM admin_users WHERE email = $1",
    [email],
  );
  return mapAdminUser(result.rows[0], { includeSensitive: true });
}

export async function findAdminById(id, client, { includeSensitive = false } = {}) {
  const result = await db(client).query(
    "SELECT * FROM admin_users WHERE id = $1",
    [id],
  );
  return mapAdminUser(result.rows[0], { includeSensitive });
}

export async function createAdminUser(data, client) {
  const result = await db(client).query(
    `INSERT INTO admin_users (
      id,
      name,
      email,
      password_hash,
      status,
      is_super_admin,
      must_change_password,
      password_changed_at,
      created_by
    )
    VALUES ($1, $2, $3, $4, 'ACTIVE', $5, $6, $7, $8)
    RETURNING *`,
    [
      randomUUID(),
      data.name,
      data.email,
      data.passwordHash,
      Boolean(data.isSuperAdmin),
      Boolean(data.mustChangePassword),
      data.passwordChangedAt ?? null,
      data.createdBy ?? null,
    ],
  );

  return mapAdminUser(result.rows[0]);
}

export async function updateAdminLoginSuccess({ id, ipAddress }, client) {
  const result = await db(client).query(
    `UPDATE admin_users
     SET last_login_at = now(),
         last_login_ip = $2,
         failed_login_attempts = 0,
         locked_until = NULL,
         status = CASE WHEN status = 'LOCKED' THEN 'ACTIVE' ELSE status END
     WHERE id = $1
     RETURNING *`,
    [id, ipAddress ?? null],
  );

  return mapAdminUser(result.rows[0]);
}

export async function updateAdminFailedLogin({ id, maxAttempts, lockUntil }, client) {
  const result = await db(client).query(
    `UPDATE admin_users
     SET failed_login_attempts = failed_login_attempts + 1,
         locked_until = CASE
           WHEN failed_login_attempts + 1 >= $2 THEN $3
           ELSE locked_until
         END,
         status = CASE
           WHEN failed_login_attempts + 1 >= $2 THEN 'LOCKED'
           ELSE status
         END
     WHERE id = $1
     RETURNING *`,
    [id, maxAttempts, lockUntil],
  );

  return mapAdminUser(result.rows[0], { includeSensitive: true });
}

export async function unlockExpiredAdminLock(id, client) {
  const result = await db(client).query(
    `UPDATE admin_users
     SET status = 'ACTIVE',
         locked_until = NULL,
         failed_login_attempts = 0
     WHERE id = $1
       AND status = 'LOCKED'
       AND locked_until IS NOT NULL
       AND locked_until <= now()
     RETURNING *`,
    [id],
  );

  return mapAdminUser(result.rows[0], { includeSensitive: true });
}

export async function createAdminSession(data, client) {
  const result = await db(client).query(
    `INSERT INTO admin_sessions (
      id,
      admin_user_id,
      refresh_token_hash,
      ip_address,
      user_agent,
      expires_at
    )
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING *`,
    [
      randomUUID(),
      data.adminUserId,
      data.refreshTokenHash,
      data.ipAddress ?? null,
      data.userAgent ?? null,
      data.expiresAt,
    ],
  );

  return mapSession(result.rows[0]);
}

export async function findActiveAdminSessionByTokenHash(refreshTokenHash, client) {
  const result = await db(client).query(
    `SELECT *
     FROM admin_sessions
     WHERE refresh_token_hash = $1
       AND revoked_at IS NULL
       AND expires_at > now()`,
    [refreshTokenHash],
  );

  return mapSession(result.rows[0]);
}

export async function findAdminSessionByTokenHash(refreshTokenHash, client) {
  const result = await db(client).query(
    "SELECT * FROM admin_sessions WHERE refresh_token_hash = $1",
    [refreshTokenHash],
  );

  return mapSession(result.rows[0]);
}

export async function revokeAdminSessionByTokenHash(refreshTokenHash, client) {
  const result = await db(client).query(
    `UPDATE admin_sessions
     SET revoked_at = COALESCE(revoked_at, now())
     WHERE refresh_token_hash = $1
     RETURNING *`,
    [refreshTokenHash],
  );

  return mapSession(result.rows[0]);
}

export async function revokeAllActiveAdminSessions(adminUserId, client) {
  const result = await db(client).query(
    `UPDATE admin_sessions
     SET revoked_at = COALESCE(revoked_at, now())
     WHERE admin_user_id = $1
       AND revoked_at IS NULL
     RETURNING *`,
    [adminUserId],
  );

  return result.rows.map(mapSession);
}

export async function listAdminRoles(client) {
  const result = await db(client).query(
    "SELECT * FROM admin_roles ORDER BY name ASC",
  );
  return result.rows.map(mapRole);
}

export async function findAdminRoles(adminUserId, client) {
  const result = await db(client).query(
    `SELECT r.*
     FROM admin_roles r
     JOIN admin_user_roles aur ON aur.role_id = r.id
     WHERE aur.admin_user_id = $1
     ORDER BY r.name ASC`,
    [adminUserId],
  );
  return result.rows.map(mapRole);
}

export async function findAdminPermissions(adminUserId, client) {
  const result = await db(client).query(
    `SELECT DISTINCT p.permission_key
     FROM admin_permissions p
     JOIN admin_role_permissions arp ON arp.permission_id = p.id
     JOIN admin_user_roles aur ON aur.role_id = arp.role_id
     WHERE aur.admin_user_id = $1
     ORDER BY p.permission_key ASC`,
    [adminUserId],
  );
  return result.rows.map((row) => row.permission_key);
}

export async function assignRolesToAdmin(adminUserId, roleIds, client) {
  if (!roleIds.length) {
    return [];
  }

  const result = await db(client).query(
    `INSERT INTO admin_user_roles (admin_user_id, role_id)
     SELECT $1, role_id
     FROM unnest($2::uuid[]) AS role_id
     ON CONFLICT DO NOTHING
     RETURNING role_id`,
    [adminUserId, roleIds],
  );

  return result.rows.map((row) => row.role_id);
}

export async function findRolesByIds(roleIds, client) {
  if (!roleIds.length) {
    return [];
  }

  const result = await db(client).query(
    "SELECT * FROM admin_roles WHERE id = ANY($1::uuid[])",
    [roleIds],
  );
  return result.rows.map(mapRole);
}

export async function listSubAdmins(client) {
  const result = await db(client).query(
    `SELECT *
     FROM admin_users
     ORDER BY created_at DESC`,
  );
  return result.rows.map((row) => mapAdminUser(row));
}

export async function updateAdminStatus({ id, status }, client) {
  const result = await db(client).query(
    `UPDATE admin_users
     SET status = $2,
         locked_until = CASE WHEN $2 = 'LOCKED' THEN locked_until ELSE NULL END
     WHERE id = $1
     RETURNING *`,
    [id, status],
  );

  return mapAdminUser(result.rows[0]);
}

export async function updateAdminPassword(
  { id, passwordHash, mustChangePassword = false },
  client,
) {
  const result = await db(client).query(
    `UPDATE admin_users
     SET password_hash = $2,
         must_change_password = $3,
         password_changed_at = now(),
         failed_login_attempts = 0,
         locked_until = NULL,
         status = CASE WHEN status = 'LOCKED' THEN 'ACTIVE' ELSE status END
     WHERE id = $1
     RETURNING *`,
    [id, passwordHash, Boolean(mustChangePassword)],
  );

  return mapAdminUser(result.rows[0]);
}

export async function countActiveSuperAdminsExcluding(id, client) {
  const result = await db(client).query(
    `SELECT COUNT(*)::int AS count
     FROM admin_users
     WHERE is_super_admin = true
       AND status = 'ACTIVE'
       AND id <> $1`,
    [id],
  );
  return result.rows[0]?.count || 0;
}

export async function upsertAdminPermission({ permissionKey, description }, client) {
  const result = await db(client).query(
    `INSERT INTO admin_permissions (id, permission_key, description)
     VALUES ($1, $2, $3)
     ON CONFLICT (permission_key)
     DO UPDATE SET description = EXCLUDED.description
     RETURNING *`,
    [randomUUID(), permissionKey, description ?? null],
  );
  return result.rows[0];
}

export async function upsertAdminRole({ name, description }, client) {
  const result = await db(client).query(
    `INSERT INTO admin_roles (id, name, description, is_system_role)
     VALUES ($1, $2, $3, true)
     ON CONFLICT (name)
     DO UPDATE SET description = EXCLUDED.description,
                   is_system_role = true
     RETURNING *`,
    [randomUUID(), name, description ?? null],
  );
  return mapRole(result.rows[0]);
}

export async function replaceRolePermissions({ roleId, permissionKeys }, client) {
  await db(client).query("DELETE FROM admin_role_permissions WHERE role_id = $1", [
    roleId,
  ]);

  if (!permissionKeys.length) {
    return;
  }

  await db(client).query(
    `INSERT INTO admin_role_permissions (role_id, permission_id)
     SELECT $1, id
     FROM admin_permissions
     WHERE permission_key = ANY($2::varchar[])`,
    [roleId, permissionKeys],
  );
}

export async function createAdminAuditLog(data, client) {
  const result = await db(client).query(
    `INSERT INTO admin_audit_logs (
      id,
      actor_admin_id,
      action,
      resource_type,
      resource_id,
      old_value,
      new_value,
      reason,
      ip_address,
      user_agent,
      request_id,
      severity
    )
    VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7::jsonb, $8, $9, $10, $11, $12)
    RETURNING *`,
    [
      randomUUID(),
      data.actorAdminId ?? null,
      data.action,
      data.resourceType,
      data.resourceId ?? null,
      data.oldValue === null || data.oldValue === undefined
        ? null
        : JSON.stringify(data.oldValue),
      data.newValue === null || data.newValue === undefined
        ? null
        : JSON.stringify(data.newValue),
      data.reason ?? null,
      data.ipAddress ?? null,
      data.userAgent ?? null,
      data.requestId ?? null,
      data.severity || "INFO",
    ],
  );

  return result.rows[0];
}
