import { query } from "../../config/db.js";

function toNumber(value) {
  return value === null || value === undefined ? null : Number(value);
}

function mapListingImage(row) {
  return {
    id: row.id,
    imageUrl: row.image_url,
    sortOrder: row.sort_order,
  };
}

function mapListing(row, images = []) {
  return {
    id: row.id,
    sellerId: row.seller_id,
    title: row.title,
    goldType: row.gold_type,
    purity: row.purity,
    weightGrams: toNumber(row.weight_grams),
    expectedPrice: toNumber(row.expected_price),
    description: row.description,
    condition: row.condition,
    hallmarkAvailable: row.hallmark_available,
    billAvailable: row.bill_available,
    purchaseYear: row.purchase_year,
    city: row.city,
    state: row.state,
    latitude: toNumber(row.latitude),
    longitude: toNumber(row.longitude),
    status: row.status,
    acceptedBidId: row.accepted_bid_id,
    distanceKm: toNumber(row.distance_km),
    matchMode: row.match_mode,
    images,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function findImagesByListingIds(listingIds) {
  if (listingIds.length === 0) {
    return new Map();
  }

  const result = await query(
    `SELECT *
     FROM listing_images
     WHERE listing_id = ANY($1::uuid[])
     ORDER BY listing_id, sort_order ASC`,
    [listingIds],
  );
  const imagesByListingId = new Map();

  for (const row of result.rows) {
    const images = imagesByListingId.get(row.listing_id) || [];
    images.push(mapListingImage(row));
    imagesByListingId.set(row.listing_id, images);
  }

  return imagesByListingId;
}

export async function findApprovedJewellerLocation(jewellerId) {
  const result = await query(
    `SELECT city, state, latitude, longitude
     FROM jeweller_business_verifications
     WHERE jeweller_id = $1
       AND status = 'APPROVED'
     ORDER BY reviewed_at DESC NULLS LAST, created_at DESC
     LIMIT 1`,
    [jewellerId],
  );

  const row = result.rows[0];

  if (!row) {
    return null;
  }

  return {
    city: row.city,
    state: row.state,
    latitude: toNumber(row.latitude),
    longitude: toNumber(row.longitude),
  };
}

export async function listMatchedListings({ location, radiusKm, limit }) {
  const safeLimit = Math.min(Math.max(Number(limit) || 50, 1), 100);
  const hasCoordinates =
    Number.isFinite(location.latitude) && Number.isFinite(location.longitude);

  const params = [
    location.latitude,
    location.longitude,
    radiusKm,
    location.city,
    location.state,
    safeLimit,
  ];
  const distanceExpression = hasCoordinates
    ? `(
        6371 * acos(
          LEAST(
            1,
            GREATEST(
              -1,
              cos(radians($1)) * cos(radians(latitude)) *
              cos(radians(longitude) - radians($2)) +
              sin(radians($1)) * sin(radians(latitude))
            )
          )
        )
      )`
    : "NULL";

  const result = await query(
    `SELECT *
     FROM (
       SELECT
         gl.*,
         CASE
           WHEN $1::numeric IS NOT NULL
            AND $2::numeric IS NOT NULL
            AND gl.latitude IS NOT NULL
            AND gl.longitude IS NOT NULL
           THEN ${distanceExpression}
           ELSE NULL
         END AS distance_km,
         CASE
           WHEN $1::numeric IS NOT NULL
            AND $2::numeric IS NOT NULL
            AND gl.latitude IS NOT NULL
            AND gl.longitude IS NOT NULL
            AND ${distanceExpression} <= $3
           THEN 'RADIUS'
           WHEN lower(gl.city) = lower($4)
            AND lower(gl.state) = lower($5)
           THEN 'CITY'
           ELSE 'NEAREST_FALLBACK'
         END AS match_mode
       FROM gold_listings gl
       WHERE gl.status = 'ACTIVE'
     ) matched
     ORDER BY
       CASE match_mode
         WHEN 'RADIUS' THEN 1
         WHEN 'CITY' THEN 2
         ELSE 3
       END,
       distance_km ASC NULLS LAST,
       created_at DESC
     LIMIT $6`,
    params,
  );
  const imagesByListingId = await findImagesByListingIds(
    result.rows.map((row) => row.id),
  );

  return result.rows.map((row) => mapListing(row, imagesByListingId.get(row.id) || []));
}
