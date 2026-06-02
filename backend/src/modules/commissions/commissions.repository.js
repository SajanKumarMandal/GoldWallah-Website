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
    sellerId: row.seller_id,
    sellerName: row.seller_name,
    grossDealAmount: toNumber(row.gross_deal_amount),
    commissionRate: toNumber(row.commission_rate),
    commissionAmount: toNumber(row.commission_amount),
    status: row.status,
    razorpayPaymentId: row.razorpay_payment_id,
    paymentReference: row.payment_reference,
    paymentNote: row.payment_note,
    paymentAttemptCount: Number(row.payment_attempt_count || 0),
    lastPaymentAttemptAt: row.last_payment_attempt_at,
    paidAt: row.paid_at,
    dueAt: row.due_at,
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
    su.full_name AS seller_name,
    d.status AS deal_status,
    gl.title AS listing_title
   FROM platform_commissions pc
   LEFT JOIN users su ON su.id = pc.seller_id
   LEFT JOIN deals d ON d.id = pc.deal_id
   LEFT JOIN gold_listings gl ON gl.id = d.listing_id`;
}

export async function listJewellerCommissions({ jewellerId, status, limit }, client) {
  const safeLimit = Math.min(Math.max(Number(limit) || 50, 1), 100);
  const params = [jewellerId, safeLimit];
  const statusFilter = status ? "AND pc.status = $3" : "";

  if (status) {
    params.push(status);
  }

  const result = await db(client).query(
    `${commissionSelect()}
     WHERE pc.jeweller_id = $1
       ${statusFilter}
     ORDER BY pc.created_at DESC
     LIMIT $2`,
    params,
  );

  return result.rows.map(mapCommission);
}

export async function findJewellerCommissionById(
  { commissionId, jewellerId },
  client,
) {
  const result = await db(client).query(
    `${commissionSelect()}
     WHERE pc.id = $1
       AND pc.jeweller_id = $2`,
    [commissionId, jewellerId],
  );

  return mapCommission(result.rows[0]);
}

export async function submitCommissionPayment(
  { commissionId, jewellerId, paymentReference, paymentNote },
  client,
) {
  const result = await db(client).query(
    `UPDATE platform_commissions
     SET status = 'PAYMENT_INITIATED',
         payment_reference = $3,
         payment_note = $4,
         payment_attempt_count = payment_attempt_count + 1,
         last_payment_attempt_at = now()
     WHERE id = $1
       AND jeweller_id = $2
       AND status IN ('PENDING', 'PAYMENT_INITIATED', 'FAILED', 'DISPUTED')
       AND payment_attempt_count < 5
     RETURNING id`,
    [commissionId, jewellerId, paymentReference, paymentNote ?? null],
  );

  return result.rows[0]
    ? findJewellerCommissionById({ commissionId, jewellerId }, client)
    : null;
}

export async function createCommissionAuditLog(data, client) {
  await db(client).query(
    `INSERT INTO audit_logs (
      id,
      actor_user_id,
      action,
      entity_type,
      entity_id,
      metadata,
      ip_address,
      user_agent
    )
    VALUES (gen_random_uuid(), $1, $2, 'PLATFORM_COMMISSION', $3, $4::jsonb, $5, $6)`,
    [
      data.actorUserId,
      data.action,
      data.commissionId,
      JSON.stringify(data.metadata || {}),
      data.ipAddress ?? null,
      data.userAgent ?? null,
    ],
  );
}
