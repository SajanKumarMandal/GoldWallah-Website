import { randomUUID } from "node:crypto";

import { query } from "../../config/db.js";

function db(client) {
  return client || { query };
}

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
  if (!row) {
    return null;
  }

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
    // TODO: Add an FK to bids(id) after the private bids table exists.
    acceptedBidId: row.accepted_bid_id,
    images,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function findImagesByListingIds(listingIds, client) {
  if (listingIds.length === 0) {
    return new Map();
  }

  const result = await db(client).query(
    `SELECT *
     FROM listing_images
     WHERE listing_id = ANY($1::uuid[])
     ORDER BY listing_id, sort_order ASC`,
    [listingIds],
  );
  const imagesByListingId = new Map();

  for (const row of result.rows) {
    const currentImages = imagesByListingId.get(row.listing_id) || [];
    currentImages.push(mapListingImage(row));
    imagesByListingId.set(row.listing_id, currentImages);
  }

  return imagesByListingId;
}

export async function createListing(data, client) {
  const result = await db(client).query(
    `INSERT INTO gold_listings (
      id,
      seller_id,
      title,
      gold_type,
      purity,
      weight_grams,
      expected_price,
      description,
      condition,
      hallmark_available,
      bill_available,
      purchase_year,
      city,
      state,
      latitude,
      longitude
    )
    VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16
    )
    RETURNING *`,
    [
      randomUUID(),
      data.sellerId,
      data.title,
      data.goldType,
      data.purity,
      data.weightGrams,
      data.expectedPrice ?? null,
      data.description ?? null,
      data.condition ?? null,
      data.hallmarkAvailable ?? false,
      data.billAvailable ?? false,
      data.purchaseYear ?? null,
      data.city,
      data.state,
      data.latitude ?? null,
      data.longitude ?? null,
    ],
  );

  return mapListing(result.rows[0]);
}

export async function insertListingImages(listingId, imageUrls, client) {
  if (imageUrls.length === 0) {
    return [];
  }

  const values = [];
  const params = [];

  imageUrls.forEach((imageUrl, index) => {
    const paramOffset = index * 4;
    values.push(
      `($${paramOffset + 1}, $${paramOffset + 2}, $${paramOffset + 3}, $${paramOffset + 4})`,
    );
    params.push(randomUUID(), listingId, imageUrl, index);
  });

  const result = await db(client).query(
    `INSERT INTO listing_images (id, listing_id, image_url, sort_order)
     VALUES ${values.join(", ")}
     RETURNING *`,
    params,
  );

  return result.rows.map(mapListingImage);
}

export async function listSellerListings({ sellerId, status }, client) {
  const params = [sellerId];
  const statusFilter = status ? "AND status = $2" : "";

  if (status) {
    params.push(status);
  }

  const result = await db(client).query(
    `SELECT *
     FROM gold_listings
     WHERE seller_id = $1
       ${statusFilter}
     ORDER BY created_at DESC`,
    params,
  );
  const imagesByListingId = await findImagesByListingIds(
    result.rows.map((row) => row.id),
    client,
  );

  return result.rows.map((row) => mapListing(row, imagesByListingId.get(row.id) || []));
}

export async function listActiveMarketplaceListings({ city, state }, client) {
  const params = [];
  const filters = ["status = 'ACTIVE'"];

  if (city) {
    params.push(city);
    filters.push(`lower(city) = lower($${params.length})`);
  }

  if (state) {
    params.push(state);
    filters.push(`lower(state) = lower($${params.length})`);
  }

  const result = await db(client).query(
    `SELECT *
     FROM gold_listings
     WHERE ${filters.join(" AND ")}
     ORDER BY created_at DESC`,
    params,
  );
  const imagesByListingId = await findImagesByListingIds(
    result.rows.map((row) => row.id),
    client,
  );

  return result.rows.map((row) => mapListing(row, imagesByListingId.get(row.id) || []));
}

export async function findListingById(id, client) {
  const result = await db(client).query(
    `SELECT *
     FROM gold_listings
     WHERE id = $1`,
    [id],
  );

  if (!result.rows[0]) {
    return null;
  }

  const imagesByListingId = await findImagesByListingIds([id], client);
  return mapListing(result.rows[0], imagesByListingId.get(id) || []);
}

export async function findActiveMarketplaceListingById(id, client) {
  const listing = await findListingById(id, client);

  if (!listing || listing.status !== "ACTIVE") {
    return null;
  }

  return listing;
}

export async function getListingOwnershipAndStatus(id, client) {
  const result = await db(client).query(
    `SELECT id, seller_id, status
     FROM gold_listings
     WHERE id = $1`,
    [id],
  );

  if (!result.rows[0]) {
    return null;
  }

  return {
    id: result.rows[0].id,
    sellerId: result.rows[0].seller_id,
    status: result.rows[0].status,
  };
}

export async function updateListingFields({ id, sellerId, data }, client) {
  const columnByField = {
    title: "title",
    goldType: "gold_type",
    purity: "purity",
    weightGrams: "weight_grams",
    expectedPrice: "expected_price",
    description: "description",
    condition: "condition",
    hallmarkAvailable: "hallmark_available",
    billAvailable: "bill_available",
    purchaseYear: "purchase_year",
    city: "city",
    state: "state",
    latitude: "latitude",
    longitude: "longitude",
  };
  const entries = Object.entries(data).filter(([, value]) => value !== undefined);

  if (entries.length === 0) {
    const result = await db(client).query(
      `UPDATE gold_listings
       SET updated_at = updated_at
       WHERE id = $1
         AND seller_id = $2
         AND status = 'ACTIVE'
       RETURNING *`,
      [id, sellerId],
    );

    if (!result.rows[0]) {
      return null;
    }

    const imagesByListingId = await findImagesByListingIds([id], client);
    return mapListing(result.rows[0], imagesByListingId.get(id) || []);
  }

  const setClauses = entries.map(([field], index) => {
    return `${columnByField[field]} = $${index + 3}`;
  });
  const params = [id, sellerId, ...entries.map(([, value]) => value)];
  const result = await db(client).query(
    `UPDATE gold_listings
     SET ${setClauses.join(", ")}
     WHERE id = $1
       AND seller_id = $2
       AND status = 'ACTIVE'
     RETURNING *`,
    params,
  );

  if (!result.rows[0]) {
    return null;
  }

  const imagesByListingId = await findImagesByListingIds([id], client);
  return mapListing(result.rows[0], imagesByListingId.get(id) || []);
}

export async function deleteListingImages(listingId, client) {
  const result = await db(client).query(
    `DELETE FROM listing_images
     WHERE listing_id = $1
     RETURNING *`,
    [listingId],
  );

  return result.rows.map(mapListingImage);
}

export async function cancelListing({ id, sellerId }, client) {
  const result = await db(client).query(
    `UPDATE gold_listings
     SET status = 'CANCELLED'
     WHERE id = $1
       AND seller_id = $2
       AND status = 'ACTIVE'
     RETURNING *`,
    [id, sellerId],
  );

  if (!result.rows[0]) {
    return null;
  }

  const imagesByListingId = await findImagesByListingIds([id], client);
  return mapListing(result.rows[0], imagesByListingId.get(id) || []);
}
