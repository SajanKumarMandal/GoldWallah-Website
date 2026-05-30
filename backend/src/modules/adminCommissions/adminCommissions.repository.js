import { query } from "../../config/db.js";

function db(client) {
  return client || { query };
}

function toNumber(value) {
  return value === null || value === undefined ? null : Number(value);
}

function mapCommission(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    dealId: row.deal_id,
    jewellerId: row.jeweller_id,
    jewellerName: row.jeweller_name,
    jewellerEmail: row.jeweller_email,
    sellerId: row.seller_id,
    sellerName: row.seller_name,
    sellerEmail: row.seller_email,
    grossDealAmount: toNumber(row.gross_deal_amount),
    commissionRate: toNumber(row.commission_rate),
    commissionAmount: toNumber(row.commission_amount),
    status: row.status,
    paidAt: row.paid_at,
    dueAt: row.due_at,
    waivedBy: row.waived_by,
    waivedAt: row.waived_at,
    waiverReason: row.waiver_reason,
    dealStatus: row.deal_status,
    listingTitle: row.listing_title,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function commissionSelect() {
  return `SELECT
    pc.*,
    ju.full_name AS jeweller_name,
    ju.email AS jeweller_email,
    su.full_name AS seller_name,
    su.email AS seller_email,
    d.status AS deal_status,
    gl.title AS listing_title
   FROM platform_commissions pc
   JOIN users ju ON ju.id = pc.jeweller_id
   LEFT JOIN users su ON su.id = pc.seller_id
   LEFT JOIN deals d ON d.id = pc.deal_id
   LEFT JOIN gold_listings gl ON gl.id = d.listing_id`;
}

export async function listPlatformCommissions({ status, limit }, client) {
  const safeLimit = Math.min(Math.max(Number(limit) || 50, 1), 100);
  const params = [safeLimit];
  const statusFilter = status ? "WHERE pc.status = $2" : "";

  if (status) {
    params.push(status);
  }

  const result = await db(client).query(
    `${commissionSelect()}
     ${statusFilter}
     ORDER BY pc.created_at DESC
     LIMIT $1`,
    params,
  );

  return result.rows.map(mapCommission);
}

export async function findCommissionById(id, client) {
  const result = await db(client).query(
    `${commissionSelect()}
     WHERE pc.id = $1`,
    [id],
  );

  return mapCommission(result.rows[0]);
}

export async function markCommissionPaid({ id, razorpayPaymentId }, client) {
  const result = await db(client).query(
    `UPDATE platform_commissions
     SET status = 'PAID',
         paid_at = COALESCE(paid_at, now()),
         razorpay_payment_id = COALESCE($2, razorpay_payment_id)
     WHERE id = $1
       AND status IN ('PENDING', 'PAYMENT_INITIATED', 'FAILED', 'DISPUTED')
     RETURNING *`,
    [id, razorpayPaymentId ?? null],
  );

  return result.rows[0] ? findCommissionById(id, client) : null;
}

export async function waiveCommission({ id, adminId, reason }, client) {
  const result = await db(client).query(
    `UPDATE platform_commissions
     SET status = 'WAIVED',
         waived_by = $2,
         waived_at = now(),
         waiver_reason = $3
     WHERE id = $1
       AND status IN ('PENDING', 'PAYMENT_INITIATED', 'FAILED', 'DISPUTED')
     RETURNING *`,
    [id, adminId, reason],
  );

  return result.rows[0] ? findCommissionById(id, client) : null;
}

export async function markDealReadyToSettle(dealId, client) {
  if (!dealId) {
    return;
  }

  await db(client).query(
    `UPDATE deals
     SET status = 'READY_TO_SETTLE'
     WHERE id = $1
       AND status = 'COMMISSION_PENDING'`,
    [dealId],
  );
}

export async function countOutstandingCommissions(jewellerId, client) {
  const result = await db(client).query(
    `SELECT COUNT(*)::int AS count
     FROM platform_commissions
     WHERE jeweller_id = $1
       AND status IN ('PENDING', 'PAYMENT_INITIATED', 'FAILED', 'DISPUTED')`,
    [jewellerId],
  );

  return result.rows[0]?.count || 0;
}

export async function clearJewellerCommissionLock(jewellerId, client) {
  await db(client).query(
    `UPDATE users
     SET commission_lock_status = 'CLEAR',
         commission_locked_at = NULL,
         commission_lock_reason = NULL
     WHERE id = $1
       AND commission_lock_status = 'LOCKED'`,
    [jewellerId],
  );
}
