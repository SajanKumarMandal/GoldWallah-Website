import { randomUUID } from "node:crypto";

import { query } from "../../config/db.js";

function db(client) {
  return client || { query };
}

function toNumber(value) {
  return value === null || value === undefined ? null : Number(value);
}

function mapBid(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    listingId: row.listing_id,
    jewellerId: row.jeweller_id,
    jewellerName: row.jeweller_name,
    sellerId: row.seller_id,
    listingTitle: row.listing_title,
    listingStatus: row.listing_status,
    bidAmount: toNumber(row.bid_amount),
    message: row.message,
    status: row.status,
    decidedAt: row.decided_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function findActiveListingForBid(listingId, client) {
  const result = await db(client).query(
    `SELECT id, seller_id, title, status
     FROM gold_listings
     WHERE id = $1`,
    [listingId],
  );

  const row = result.rows[0];

  if (!row) {
    return null;
  }

  return {
    id: row.id,
    sellerId: row.seller_id,
    title: row.title,
    status: row.status,
  };
}

export async function createBid(data, client) {
  const result = await db(client).query(
    `INSERT INTO private_bids (
      id,
      listing_id,
      jeweller_id,
      bid_amount,
      message
    )
    VALUES ($1, $2, $3, $4, $5)
    RETURNING *`,
    [
      randomUUID(),
      data.listingId,
      data.jewellerId,
      data.bidAmount,
      data.message ?? null,
    ],
  );

  return mapBid(result.rows[0]);
}

export async function listBidsForSellerListing({ listingId, sellerId }, client) {
  const result = await db(client).query(
    `SELECT
       b.*,
       u.full_name AS jeweller_name,
       l.seller_id,
       l.title AS listing_title
     FROM private_bids b
     JOIN gold_listings l ON l.id = b.listing_id
     JOIN users u ON u.id = b.jeweller_id
     WHERE b.listing_id = $1
       AND l.seller_id = $2
     ORDER BY b.created_at DESC`,
    [listingId, sellerId],
  );

  return result.rows.map(mapBid);
}

export async function listBidsForJeweller(jewellerId, client) {
  const result = await db(client).query(
    `SELECT
       b.*,
       l.seller_id,
       l.title AS listing_title,
       l.status AS listing_status
     FROM private_bids b
     JOIN gold_listings l ON l.id = b.listing_id
     WHERE b.jeweller_id = $1
     ORDER BY b.created_at DESC`,
    [jewellerId],
  );

  return result.rows.map(mapBid);
}

export async function findBidForSellerDecision({ bidId, sellerId }, client) {
  const result = await db(client).query(
    `SELECT
       b.*,
       l.seller_id,
       l.title AS listing_title,
       l.status AS listing_status
     FROM private_bids b
     JOIN gold_listings l ON l.id = b.listing_id
     WHERE b.id = $1
       AND l.seller_id = $2`,
    [bidId, sellerId],
  );

  return mapBid(result.rows[0]);
}

export async function acceptBid({ bidId, listingId }, client) {
  const bidResult = await db(client).query(
    `UPDATE private_bids
     SET status = 'ACCEPTED',
         decided_at = now()
     WHERE id = $1
       AND listing_id = $2
       AND status = 'PENDING'
     RETURNING *`,
    [bidId, listingId],
  );

  if (!bidResult.rows[0]) {
    return null;
  }

  await db(client).query(
    `UPDATE private_bids
     SET status = 'REJECTED',
         decided_at = COALESCE(decided_at, now())
     WHERE listing_id = $1
       AND id <> $2
       AND status = 'PENDING'`,
    [listingId, bidId],
  );

  const listingResult = await db(client).query(
    `UPDATE gold_listings
     SET status = 'BID_ACCEPTED',
         accepted_bid_id = $2
     WHERE id = $1
       AND status = 'ACTIVE'`,
    [listingId, bidId],
  );

  if (!listingResult.rows[0]) {
    return null;
  }

  return mapBid(bidResult.rows[0]);
}

export async function rejectBid(bidId, client) {
  const result = await db(client).query(
    `UPDATE private_bids
     SET status = 'REJECTED',
         decided_at = now()
     WHERE id = $1
       AND status = 'PENDING'
     RETURNING *`,
    [bidId],
  );

  return mapBid(result.rows[0]);
}

export async function createBidAuditLog(data, client) {
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
    VALUES ($1, $2, $3, 'PRIVATE_BID', $4, $5::jsonb, $6, $7)`,
    [
      randomUUID(),
      data.actorUserId,
      data.action,
      data.bidId,
      JSON.stringify(data.metadata || {}),
      data.ipAddress ?? null,
      data.userAgent ?? null,
    ],
  );
}
