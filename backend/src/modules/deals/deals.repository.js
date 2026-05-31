import { query } from "../../config/db.js";

function db(client) {
  return client || { query };
}

function toNumber(value) {
  return value === null || value === undefined ? null : Number(value);
}

function mapDeal(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    listingId: row.listing_id,
    acceptedBidId: row.accepted_bid_id,
    sellerId: row.seller_id,
    sellerName: row.seller_name,
    jewellerId: row.jeweller_id,
    jewellerName: row.jeweller_name,
    listingTitle: row.listing_title,
    finalAmount: toNumber(row.final_amount),
    status: row.status,
    commissionStatus: row.commission_status,
    commissionAmount: toNumber(row.commission_amount),
    completedAt: row.completed_at,
    cancelledAt: row.cancelled_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function dealSelect() {
  return `SELECT
    d.*,
    gl.title AS listing_title,
    su.full_name AS seller_name,
    ju.full_name AS jeweller_name,
    pc.status AS commission_status,
    pc.commission_amount
   FROM deals d
   JOIN gold_listings gl ON gl.id = d.listing_id
   JOIN users su ON su.id = d.seller_id
   JOIN users ju ON ju.id = d.jeweller_id
   LEFT JOIN platform_commissions pc ON pc.deal_id = d.id`;
}

export async function listDealsForUser({ userId, role, status, limit }, client) {
  const safeLimit = Math.min(Math.max(Number(limit) || 50, 1), 100);
  const ownerColumn = role === "SELLER" ? "d.seller_id" : "d.jeweller_id";
  const params = [userId, safeLimit];
  const statusFilter = status ? "AND d.status = $3" : "";

  if (status) {
    params.push(status);
  }

  const result = await db(client).query(
    `${dealSelect()}
     WHERE ${ownerColumn} = $1
       ${statusFilter}
     ORDER BY d.created_at DESC
     LIMIT $2`,
    params,
  );

  return result.rows.map(mapDeal);
}

export async function findDealForUser({ dealId, userId }, client) {
  const result = await db(client).query(
    `${dealSelect()}
     WHERE d.id = $1
       AND (d.seller_id = $2 OR d.jeweller_id = $2)`,
    [dealId, userId],
  );

  return mapDeal(result.rows[0]);
}

export async function completeSellerDeal({ dealId, sellerId }, client) {
  const result = await db(client).query(
    `UPDATE deals
     SET status = 'COMPLETED',
         completed_at = COALESCE(completed_at, now())
     WHERE id = $1
       AND seller_id = $2
       AND status = 'READY_TO_SETTLE'
     RETURNING *`,
    [dealId, sellerId],
  );

  if (!result.rows[0]) {
    return null;
  }

  await db(client).query(
    `UPDATE gold_listings
     SET status = 'SOLD'
     WHERE id = $1
       AND seller_id = $2
       AND status = 'BID_ACCEPTED'`,
    [result.rows[0].listing_id, sellerId],
  );

  return findDealForUser({ dealId, userId: sellerId }, client);
}

export async function createDealAuditLog(data, client) {
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
    VALUES (gen_random_uuid(), $1, $2, 'DEAL', $3, $4::jsonb, $5, $6)`,
    [
      data.actorUserId,
      data.action,
      data.dealId,
      JSON.stringify(data.metadata || {}),
      data.ipAddress ?? null,
      data.userAgent ?? null,
    ],
  );
}
