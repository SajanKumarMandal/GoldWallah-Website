import { query } from "../../config/db.js";

// Geo matching data access. Primary matching stays inside PostGIS so radius
// filters, distance ordering, and GIST indexes work under load.
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
    distanceMeters: toNumber(row.distance_meters),
    distanceKm:
      row.distance_meters === null || row.distance_meters === undefined
        ? null
        : Number((Number(row.distance_meters) / 1000).toFixed(2)),
    matchMode: row.match_mode,
    images,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapJeweller(row) {
  return {
    jewellerId: row.jeweller_id,
    shopName: row.shop_name,
    city: row.city,
    state: row.state,
    businessType: row.business_type,
    yearsInBusiness: row.years_in_business,
    distanceMeters: toNumber(row.distance_meters),
    distanceKm:
      row.distance_meters === null || row.distance_meters === undefined
        ? null
        : Number((Number(row.distance_meters) / 1000).toFixed(2)),
    matchMode: row.match_mode,
  };
}

function paginationParams({ limit, lastDistance, lastId, maxLimit }) {
  return {
    safeLimit: Math.min(Math.max(Number(limit) || maxLimit, 1), maxLimit),
    cursorDistance:
      lastDistance === null || lastDistance === undefined
        ? null
        : Number(lastDistance),
    cursorId: lastId || null,
  };
}

function buildCursor(rows) {
  const lastRow = rows.at(-1);

  if (
    lastRow?.distance_meters === null ||
    lastRow?.distance_meters === undefined ||
    !lastRow?.id
  ) {
    return null;
  }

  return {
    lastDistance: Number(lastRow.distance_meters),
    lastId: lastRow.id,
  };
}

export async function findUserProfileLocation(userId) {
  const result = await query(
    `SELECT
       profile_city AS city,
       profile_state AS state,
       profile_latitude AS latitude,
       profile_longitude AS longitude
     FROM users
     WHERE id = $1
       AND account_status = 'ACTIVE'`,
    [userId],
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

export async function listMatchedListings({
  location,
  radiusKm,
  limit,
  lastDistance,
  lastId,
}) {
  const { safeLimit, cursorDistance, cursorId } = paginationParams({
    limit,
    lastDistance,
    lastId,
    maxLimit: 100,
  });

  const result = await query(
    `WITH origin AS (
       SELECT
         CASE
           WHEN $1::numeric IS NULL OR $2::numeric IS NULL THEN NULL::geography
           ELSE ST_SetSRID(
             ST_MakePoint($2::double precision, $1::double precision),
             4326
           )::geography
         END AS geog,
         NULLIF($4::text, '') AS city,
         NULLIF($5::text, '') AS state
     ),
     matched AS (
       SELECT
         gl.*,
         CASE
           WHEN origin.geog IS NOT NULL AND gl.listing_location IS NOT NULL
           THEN ST_Distance(gl.listing_location, origin.geog)
           ELSE NULL
         END AS distance_meters,
         CASE
           WHEN origin.geog IS NOT NULL
            AND gl.listing_location IS NOT NULL
            AND ST_DWithin(gl.listing_location, origin.geog, $3::numeric * 1000)
           THEN 'RADIUS'
           WHEN origin.city IS NOT NULL
            AND origin.state IS NOT NULL
            AND lower(gl.city) = lower(origin.city)
            AND lower(gl.state) = lower(origin.state)
           THEN 'CITY'
           WHEN origin.state IS NOT NULL
            AND lower(gl.state) = lower(origin.state)
           THEN 'REGION'
           ELSE 'NEAREST_FALLBACK'
         END AS match_mode,
         CASE
           WHEN origin.geog IS NOT NULL
            AND gl.listing_location IS NOT NULL
            AND ST_DWithin(gl.listing_location, origin.geog, $3::numeric * 1000)
           THEN 1
           WHEN origin.city IS NOT NULL
            AND origin.state IS NOT NULL
            AND lower(gl.city) = lower(origin.city)
            AND lower(gl.state) = lower(origin.state)
           THEN 2
           WHEN origin.state IS NOT NULL
            AND lower(gl.state) = lower(origin.state)
           THEN 3
           ELSE 4
         END AS match_rank
       FROM gold_listings gl
       JOIN users seller ON seller.id = gl.seller_id
       CROSS JOIN origin
       WHERE gl.status = 'ACTIVE'
         AND seller.role = 'SELLER'
         AND seller.kyc_status = 'APPROVED'
         AND seller.account_status = 'ACTIVE'
     )
     SELECT *
     FROM matched
     WHERE (
       $6::numeric IS NULL
       OR distance_meters > $6::numeric
       OR (distance_meters = $6::numeric AND id > $7::uuid)
       OR distance_meters IS NULL
     )
     ORDER BY
       match_rank ASC,
       distance_meters ASC NULLS LAST,
       id ASC
     LIMIT $8`,
    [
      location.latitude,
      location.longitude,
      radiusKm,
      location.city,
      location.state,
      cursorDistance,
      cursorId,
      safeLimit,
    ],
  );
  const imagesByListingId = await findImagesByListingIds(
    result.rows.map((row) => row.id),
  );

  return {
    items: result.rows.map((row) => mapListing(row, imagesByListingId.get(row.id) || [])),
    nextCursor: result.rows.length === safeLimit ? buildCursor(result.rows) : null,
  };
}

export async function findSellerListingLocation({ sellerId, listingId }) {
  const params = [sellerId];
  const listingFilter = listingId ? "AND id = $2" : "";

  if (listingId) {
    params.push(listingId);
  }

  const result = await query(
    `SELECT id, title, city, state, latitude, longitude
     FROM gold_listings
     WHERE seller_id = $1
       ${listingFilter}
     ORDER BY
       CASE WHEN latitude IS NOT NULL AND longitude IS NOT NULL THEN 0 ELSE 1 END,
       created_at DESC
     LIMIT 1`,
    params,
  );
  const row = result.rows[0];

  if (!row) {
    return null;
  }

  return {
    listingId: row.id,
    listingTitle: row.title,
    city: row.city,
    state: row.state,
    latitude: toNumber(row.latitude),
    longitude: toNumber(row.longitude),
  };
}

export async function listNearbyJewellersForSeller({
  location,
  radiusKm,
  limit,
  lastDistance,
  lastId,
}) {
  const { safeLimit, cursorDistance, cursorId } = paginationParams({
    limit,
    lastDistance,
    lastId,
    maxLimit: 50,
  });
  const result = await query(
    `WITH origin AS (
       SELECT
         CASE
           WHEN $1::numeric IS NULL OR $2::numeric IS NULL THEN NULL::geography
           ELSE ST_SetSRID(
             ST_MakePoint($2::double precision, $1::double precision),
             4326
           )::geography
         END AS geog,
         NULLIF($4::text, '') AS city,
         NULLIF($5::text, '') AS state
     ),
     latest_approved AS (
       SELECT DISTINCT ON (jeweller_id) *
       FROM jeweller_business_verifications
       WHERE status = 'APPROVED'
       ORDER BY jeweller_id, reviewed_at DESC NULLS LAST, created_at DESC
     ),
     matched AS (
       SELECT
         jbv.jeweller_id,
         jbv.jeweller_id AS id,
         jbv.shop_name,
         jbv.city,
         jbv.state,
         jbv.business_type,
         jbv.years_in_business,
         CASE
           WHEN origin.geog IS NOT NULL AND jbv.shop_location IS NOT NULL
           THEN ST_Distance(jbv.shop_location, origin.geog)
           ELSE NULL
         END AS distance_meters,
         CASE
           WHEN origin.geog IS NOT NULL
            AND jbv.shop_location IS NOT NULL
            AND ST_DWithin(jbv.shop_location, origin.geog, $3::numeric * 1000)
           THEN 'RADIUS'
           WHEN origin.city IS NOT NULL
            AND origin.state IS NOT NULL
            AND lower(jbv.city) = lower(origin.city)
            AND lower(jbv.state) = lower(origin.state)
           THEN 'CITY'
           WHEN origin.state IS NOT NULL
            AND lower(jbv.state) = lower(origin.state)
           THEN 'REGION'
           ELSE 'NEAREST_FALLBACK'
         END AS match_mode,
         CASE
           WHEN origin.geog IS NOT NULL
            AND jbv.shop_location IS NOT NULL
            AND ST_DWithin(jbv.shop_location, origin.geog, $3::numeric * 1000)
           THEN 1
           WHEN origin.city IS NOT NULL
            AND origin.state IS NOT NULL
            AND lower(jbv.city) = lower(origin.city)
            AND lower(jbv.state) = lower(origin.state)
           THEN 2
           WHEN origin.state IS NOT NULL
            AND lower(jbv.state) = lower(origin.state)
           THEN 3
           ELSE 4
         END AS match_rank,
         jbv.reviewed_at,
         jbv.created_at
       FROM latest_approved jbv
       JOIN users u ON u.id = jbv.jeweller_id
       CROSS JOIN origin
       WHERE u.role = 'JEWELLER'
         AND u.kyc_status = 'APPROVED'
         AND u.business_verification_status = 'APPROVED'
         AND u.account_status = 'ACTIVE'
     )
     SELECT *
     FROM matched
     WHERE (
       $6::numeric IS NULL
       OR distance_meters > $6::numeric
       OR (distance_meters = $6::numeric AND id > $7::uuid)
       OR distance_meters IS NULL
     )
     ORDER BY
       match_rank ASC,
       distance_meters ASC NULLS LAST,
       id ASC
     LIMIT $8`,
    [
      location.latitude,
      location.longitude,
      radiusKm,
      location.city,
      location.state,
      cursorDistance,
      cursorId,
      safeLimit,
    ],
  );

  return {
    items: result.rows.map(mapJeweller),
    nextCursor: result.rows.length === safeLimit ? buildCursor(result.rows) : null,
  };
}
