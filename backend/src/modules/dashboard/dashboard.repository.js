import { query } from "../../config/db.js";

async function tableExists(tableName) {
  const result = await query("SELECT to_regclass($1) AS table_name", [
    `public.${tableName}`,
  ]);
  return Boolean(result.rows[0]?.table_name);
}

async function tableHasColumns(tableName, columns) {
  const result = await query(
    `SELECT column_name
     FROM information_schema.columns
     WHERE table_schema = 'public'
       AND table_name = $1
       AND column_name = ANY($2::text[])`,
    [tableName, columns],
  );
  const presentColumns = new Set(result.rows.map((row) => row.column_name));
  return columns.every((column) => presentColumns.has(column));
}

async function safeCount({ tableName, requiredColumns = [], where = "", params = [] }) {
  if (!(await tableExists(tableName))) {
    return 0;
  }

  if (
    requiredColumns.length > 0 &&
    !(await tableHasColumns(tableName, requiredColumns))
  ) {
    return 0;
  }

  const result = await query(`SELECT COUNT(*)::int AS count FROM ${tableName} ${where}`, params);
  return result.rows[0]?.count || 0;
}

export async function getSellerStats(sellerId) {
  const activeListings = await safeCount({
    tableName: "listings",
    requiredColumns: ["seller_id", "status"],
    where: "WHERE seller_id = $1 AND status = 'ACTIVE'",
    params: [sellerId],
  });

  const totalBidsReceived = await safeCount({
    tableName: "bids",
    requiredColumns: ["seller_id"],
    where: "WHERE seller_id = $1",
    params: [sellerId],
  });

  const shortlistedBids = await safeCount({
    tableName: "bids",
    requiredColumns: ["seller_id", "status"],
    where: "WHERE seller_id = $1 AND status = 'SHORTLISTED'",
    params: [sellerId],
  });

  const completedDeals = await safeCount({
    tableName: "deals",
    requiredColumns: ["seller_id", "status"],
    where: "WHERE seller_id = $1 AND status = 'COMPLETED'",
    params: [sellerId],
  });

  return {
    activeListings,
    totalBidsReceived,
    shortlistedBids,
    completedDeals,
  };
}

export async function getJewellerStats(jewellerId) {
  const nearbyListings = await safeCount({
    tableName: "listings",
    requiredColumns: ["status"],
    where: "WHERE status = 'ACTIVE'",
  });

  const activeBids = await safeCount({
    tableName: "bids",
    requiredColumns: ["jeweller_id", "status"],
    where: "WHERE jeweller_id = $1 AND status = 'ACTIVE'",
    params: [jewellerId],
  });

  const wonDeals = await safeCount({
    tableName: "bids",
    requiredColumns: ["jeweller_id", "status"],
    where: "WHERE jeweller_id = $1 AND status = 'WON'",
    params: [jewellerId],
  });

  const completedPurchases = await safeCount({
    tableName: "deals",
    requiredColumns: ["jeweller_id", "status"],
    where: "WHERE jeweller_id = $1 AND status = 'COMPLETED'",
    params: [jewellerId],
  });

  return {
    nearbyListings,
    activeBids,
    wonDeals,
    completedPurchases,
  };
}

export async function getRecentActivity() {
  return [];
}
