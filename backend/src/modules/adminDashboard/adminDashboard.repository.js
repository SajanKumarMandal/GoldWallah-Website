import { query } from "../../config/db.js";

function clampLimit(limit) {
  const parsedLimit = Number(limit);

  if (!Number.isInteger(parsedLimit) || parsedLimit <= 0) {
    return 10;
  }

  return Math.min(parsedLimit, 50);
}

async function tableExists(tableName) {
  const result = await query("SELECT to_regclass($1) IS NOT NULL AS exists", [
    `public.${tableName}`,
  ]);
  return Boolean(result.rows[0]?.exists);
}

async function columnExists(tableName, columnName) {
  const result = await query(
    `SELECT EXISTS (
       SELECT 1
       FROM information_schema.columns
       WHERE table_schema = 'public'
         AND table_name = $1
         AND column_name = $2
     ) AS exists`,
    [tableName, columnName],
  );
  return Boolean(result.rows[0]?.exists);
}

async function countRows(sql, params = []) {
  const result = await query(sql, params);
  return Number(result.rows[0]?.count || 0);
}

export async function getDashboardSummary() {
  const hasBusinessVerifications = await tableExists(
    "jeweller_business_verifications",
  );
  const hasUserStatus = await columnExists("users", "status");
  const hasUserBlockedFlag = await columnExists("users", "is_blocked");
  const [
    totalSellers,
    totalJewellers,
    pendingSellerKyc,
    pendingJewellerKyc,
    approvedSellerKyc,
    approvedJewellerKyc,
    suspendedAdmins,
    criticalAuditEventsLast24h,
  ] = await Promise.all([
    countRows("SELECT COUNT(*) AS count FROM users WHERE role = $1", ["SELLER"]),
    countRows("SELECT COUNT(*) AS count FROM users WHERE role = $1", ["JEWELLER"]),
    countRows(
      `SELECT COUNT(*) AS count
       FROM kyc_submissions k
       JOIN users u ON u.id = k.user_id
       WHERE u.role = $1 AND k.status = $2`,
      ["SELLER", "PENDING"],
    ),
    countRows(
      `SELECT COUNT(*) AS count
       FROM kyc_submissions k
       JOIN users u ON u.id = k.user_id
       WHERE u.role = $1 AND k.status = $2`,
      ["JEWELLER", "PENDING"],
    ),
    countRows(
      `SELECT COUNT(*) AS count
       FROM kyc_submissions k
       JOIN users u ON u.id = k.user_id
       WHERE u.role = $1 AND k.status = $2`,
      ["SELLER", "APPROVED"],
    ),
    countRows(
      `SELECT COUNT(*) AS count
       FROM kyc_submissions k
       JOIN users u ON u.id = k.user_id
       WHERE u.role = $1 AND k.status = $2`,
      ["JEWELLER", "APPROVED"],
    ),
    countRows("SELECT COUNT(*) AS count FROM admin_users WHERE status = $1", [
      "SUSPENDED",
    ]),
    countRows(
      `SELECT COUNT(*) AS count
       FROM admin_audit_logs
       WHERE severity = $1
         AND created_at >= now() - interval '24 hours'`,
      ["CRITICAL"],
    ),
  ]);

  const pendingBusinessVerifications = hasBusinessVerifications
    ? await countRows(
        "SELECT COUNT(*) AS count FROM jeweller_business_verifications WHERE status = $1",
        ["PENDING"],
      )
    : 0;
  const approvedBusinessVerifications = hasBusinessVerifications
    ? await countRows(
        "SELECT COUNT(*) AS count FROM jeweller_business_verifications WHERE status = $1",
        ["APPROVED"],
      )
    : 0;
  const blockedUsers = hasUserStatus
    ? await countRows("SELECT COUNT(*) AS count FROM users WHERE status = $1", [
        "BLOCKED",
      ])
    : hasUserBlockedFlag
      ? await countRows("SELECT COUNT(*) AS count FROM users WHERE is_blocked = true")
      : 0;

  return {
    totalSellers,
    totalJewellers,
    pendingSellerKyc,
    pendingJewellerKyc,
    pendingBusinessVerifications,
    approvedSellerKyc,
    approvedJewellerKyc,
    approvedBusinessVerifications,
    blockedUsers,
    suspendedAdmins,
    criticalAuditEventsLast24h,
  };
}

export async function getPendingVerifications({ limit }) {
  const safeLimit = clampLimit(limit);
  const pendingItems = [];
  const kycResult = await query(
    `SELECT
       k.id,
       CASE
         WHEN u.role = 'SELLER' THEN 'SELLER_KYC'
         ELSE 'JEWELLER_KYC'
       END AS type,
       k.user_id,
       COALESCE(k.full_name, u.full_name) AS display_name,
       k.status,
       k.created_at AS submitted_at
     FROM kyc_submissions k
     JOIN users u ON u.id = k.user_id
     WHERE k.status = $1
     ORDER BY k.created_at DESC
     LIMIT $2`,
    ["PENDING", safeLimit],
  );

  pendingItems.push(...kycResult.rows);

  if (await tableExists("jeweller_business_verifications")) {
    const businessResult = await query(
      `SELECT
         id,
         'BUSINESS_VERIFICATION' AS type,
         jeweller_id AS user_id,
         COALESCE(shop_name, owner_name) AS display_name,
         status,
         created_at AS submitted_at
       FROM jeweller_business_verifications
       WHERE status = $1
       ORDER BY created_at DESC
       LIMIT $2`,
      ["PENDING", safeLimit],
    );
    pendingItems.push(...businessResult.rows);
  }

  return pendingItems
    .sort((left, right) => new Date(right.submitted_at) - new Date(left.submitted_at))
    .slice(0, safeLimit)
    .map((row) => ({
      id: row.id,
      type: row.type,
      userId: row.user_id,
      displayName: row.display_name,
      status: row.status,
      submittedAt: row.submitted_at,
    }));
}

export async function getRecentAuditLogs({ limit }) {
  const safeLimit = clampLimit(limit);
  const result = await query(
    `SELECT
       aal.action,
       au.name AS actor_admin_name,
       aal.resource_type,
       aal.resource_id,
       aal.severity,
       aal.created_at
     FROM admin_audit_logs aal
     LEFT JOIN admin_users au ON au.id = aal.actor_admin_id
     ORDER BY aal.created_at DESC
     LIMIT $1`,
    [safeLimit],
  );

  return result.rows.map((row) => ({
    action: row.action,
    actorAdminName: row.actor_admin_name,
    resourceType: row.resource_type,
    resourceId: row.resource_id,
    severity: row.severity,
    createdAt: row.created_at,
  }));
}

export async function getSecurityAlerts() {
  const result = await query(
    `SELECT
       aal.action,
       au.name AS actor_admin_name,
       aal.resource_type,
       aal.resource_id,
       aal.severity,
       aal.created_at
     FROM admin_audit_logs aal
     LEFT JOIN admin_users au ON au.id = aal.actor_admin_id
     WHERE aal.severity IN ($1, $2)
       AND aal.created_at >= now() - interval '24 hours'
     ORDER BY aal.created_at DESC
     LIMIT 50`,
    ["WARNING", "CRITICAL"],
  );

  return result.rows.map((row) => ({
    action: row.action,
    actorAdminName: row.actor_admin_name,
    resourceType: row.resource_type,
    resourceId: row.resource_id,
    severity: row.severity,
    createdAt: row.created_at,
  }));
}
