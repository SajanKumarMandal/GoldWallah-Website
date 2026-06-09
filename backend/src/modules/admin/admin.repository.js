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

function mapRecoveryCode(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    adminUserId: row.admin_user_id,
    codeHash: row.code_hash,
    consumedAt: row.consumed_at,
    createdAt: row.created_at,
  };
}

function mapPlatformUser(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    fullName: row.full_name,
    email: row.email,
    phone: row.phone,
    role: row.role,
    authProvider: row.auth_provider,
    isEmailVerified: row.is_email_verified,
    isPhoneVerified: row.is_phone_verified,
    kycStatus: row.kyc_status,
    businessVerificationStatus: row.business_verification_status,
    commissionLockStatus: row.commission_lock_status,
    accountStatus: row.account_status,
    profileCity: row.profile_city,
    profileState: row.profile_state,
    listingCount: Number(row.listing_count || 0),
    bidCount: Number(row.bid_count || 0),
    dealCount: Number(row.deal_count || 0),
    pendingCommissionAmount: Number(row.pending_commission_amount || 0),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function addPlatformUserFilters(filters, clauses, params) {
  if (filters.role) {
    params.push(filters.role);
    clauses.push(`u.role = $${params.length}`);
  } else {
    clauses.push("u.role IN ('SELLER', 'JEWELLER')");
  }

  if (filters.accountStatus) {
    params.push(filters.accountStatus);
    clauses.push(`u.account_status = $${params.length}`);
  }

  if (filters.kycStatus) {
    params.push(filters.kycStatus);
    clauses.push(`u.kyc_status = $${params.length}`);
  }

  if (filters.businessVerificationStatus) {
    params.push(filters.businessVerificationStatus);
    clauses.push(`u.business_verification_status = $${params.length}`);
  }

  if (filters.search) {
    params.push(`%${filters.search}%`);
    clauses.push(
      `(u.full_name ILIKE $${params.length} OR u.email ILIKE $${params.length} OR u.phone ILIKE $${params.length})`,
    );
  }

  if (filters.cursor?.createdAt && filters.cursor?.id) {
    params.push(filters.cursor.createdAt, filters.cursor.id);
    clauses.push(
      `(u.created_at, u.id) < ($${params.length - 1}::timestamptz, $${params.length}::uuid)`,
    );
  }
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
      mfa_enabled,
      mfa_secret_encrypted,
      must_change_password,
      password_changed_at,
      created_by
    )
    VALUES ($1, $2, $3, $4, 'ACTIVE', $5, $6, $7, $8, $9, $10)
    RETURNING *`,
    [
      randomUUID(),
      data.name,
      data.email,
      data.passwordHash,
      Boolean(data.isSuperAdmin),
      Boolean(data.mfaEnabled),
      data.mfaSecretEncrypted ?? null,
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

export async function replaceAdminRecoveryCodes(adminUserId, codeHashes, client) {
  await db(client).query(
    `UPDATE admin_mfa_recovery_codes
     SET consumed_at = COALESCE(consumed_at, now())
     WHERE admin_user_id = $1
       AND consumed_at IS NULL`,
    [adminUserId],
  );

  if (!codeHashes.length) {
    return [];
  }

  const result = await db(client).query(
    `INSERT INTO admin_mfa_recovery_codes (id, admin_user_id, code_hash)
     SELECT gen_random_uuid(), $1, code_hash
     FROM unnest($2::text[]) AS codes(code_hash)
     RETURNING *`,
    [adminUserId, codeHashes],
  );

  return result.rows.map(mapRecoveryCode);
}

export async function consumeAdminRecoveryCode(adminUserId, codeHash, client) {
  const result = await db(client).query(
    `UPDATE admin_mfa_recovery_codes
     SET consumed_at = now()
     WHERE admin_user_id = $1
       AND code_hash = $2
       AND consumed_at IS NULL
     RETURNING *`,
    [adminUserId, codeHash],
  );

  return mapRecoveryCode(result.rows[0]);
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

export async function listPlatformUsers(filters = {}, client) {
  const safeLimit = Math.min(Math.max(Number(filters.limit) || 50, 1), 100);
  const clauses = [];
  const params = [];

  addPlatformUserFilters(filters, clauses, params);

  params.push(safeLimit + 1);
  const result = await db(client).query(
    `WITH listing_counts AS (
       SELECT seller_id AS user_id, COUNT(*)::int AS listing_count
       FROM gold_listings
       GROUP BY seller_id
     ),
     bid_counts AS (
       SELECT jeweller_id AS user_id, COUNT(*)::int AS bid_count
       FROM private_bids
       GROUP BY jeweller_id
     ),
     deal_counts AS (
       SELECT user_id, COUNT(*)::int AS deal_count
       FROM (
         SELECT seller_id AS user_id FROM deals
         UNION ALL
         SELECT jeweller_id AS user_id FROM deals
       ) deal_users
       GROUP BY user_id
     ),
     commission_totals AS (
       SELECT
         jeweller_id AS user_id,
         COALESCE(SUM(commission_amount), 0) AS pending_commission_amount
       FROM platform_commissions
       WHERE status IN ('PENDING', 'PAYMENT_INITIATED', 'FAILED', 'DISPUTED')
       GROUP BY jeweller_id
     )
     SELECT
       u.id,
       u.full_name,
       u.email,
       u.phone,
       u.role,
       u.auth_provider,
       u.is_email_verified,
       u.is_phone_verified,
       u.kyc_status,
       u.business_verification_status,
       u.commission_lock_status,
       u.account_status,
       u.profile_city,
       u.profile_state,
       u.created_at,
       u.updated_at,
       COALESCE(lc.listing_count, 0) AS listing_count,
       COALESCE(bc.bid_count, 0) AS bid_count,
       COALESCE(dc.deal_count, 0) AS deal_count,
       COALESCE(ct.pending_commission_amount, 0) AS pending_commission_amount
     FROM users u
     LEFT JOIN listing_counts lc ON lc.user_id = u.id
     LEFT JOIN bid_counts bc ON bc.user_id = u.id
     LEFT JOIN deal_counts dc ON dc.user_id = u.id
     LEFT JOIN commission_totals ct ON ct.user_id = u.id
     WHERE ${clauses.join(" AND ")}
     ORDER BY u.created_at DESC, u.id DESC
     LIMIT $${params.length}`,
    params,
  );
  const rows = result.rows.slice(0, safeLimit);

  return {
    users: rows.map(mapPlatformUser),
    hasMore: result.rows.length > safeLimit,
    nextCursor: result.rows.length > safeLimit ? rows[rows.length - 1] : null,
  };
}

export async function findPlatformUserById(userId, client) {
  const result = await db(client).query(
    `SELECT
       id,
       full_name,
       email,
       phone,
       role,
       auth_provider,
       is_email_verified,
       is_phone_verified,
       kyc_status,
       business_verification_status,
       commission_lock_status,
       account_status,
       profile_city,
       profile_state,
       0 AS listing_count,
       0 AS bid_count,
       0 AS deal_count,
       0 AS pending_commission_amount,
       created_at,
       updated_at
     FROM users
     WHERE id = $1
       AND role IN ('SELLER', 'JEWELLER')`,
    [userId],
  );

  return mapPlatformUser(result.rows[0]);
}

export async function updatePlatformUserAccountStatus(
  { userId, accountStatus },
  client,
) {
  const result = await db(client).query(
    `UPDATE users
     SET account_status = $2,
         updated_at = now()
     WHERE id = $1
       AND role IN ('SELLER', 'JEWELLER')
     RETURNING
       id,
       full_name,
       email,
       phone,
       role,
       auth_provider,
       is_email_verified,
       is_phone_verified,
       kyc_status,
       business_verification_status,
       commission_lock_status,
       account_status,
       profile_city,
       profile_state,
       0 AS listing_count,
       0 AS bid_count,
       0 AS deal_count,
       0 AS pending_commission_amount,
       created_at,
       updated_at`,
    [userId, accountStatus],
  );

  return mapPlatformUser(result.rows[0]);
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

export async function updateAdminMfaSecret(
  { id, mfaSecretEncrypted, mfaEnabled },
  client,
) {
  const result = await db(client).query(
    `UPDATE admin_users
     SET mfa_secret_encrypted = $2,
         mfa_enabled = $3,
         updated_at = now()
     WHERE id = $1
     RETURNING *`,
    [id, mfaSecretEncrypted ?? null, Boolean(mfaEnabled)],
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
