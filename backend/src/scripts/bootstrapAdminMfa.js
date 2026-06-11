import { createHash, randomBytes, randomUUID } from "node:crypto";

import { pool, withTransaction } from "../config/db.js";
import { env } from "../config/env.js";
import { encryptSensitiveValue } from "../modules/kyc/kyc.encryption.js";
import { buildTotpUri, generateTotpSecret } from "../utils/totp.js";

const recoveryCodeCount = 8;

function fail(message) {
  console.error(message);
  process.exitCode = 1;
}

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function normalizeRecoveryCode(code) {
  return String(code || "")
    .trim()
    .replace(/-/g, "")
    .toUpperCase();
}

function hashRecoveryCode(code) {
  return createHash("sha256").update(normalizeRecoveryCode(code)).digest("hex");
}

function generateRecoveryCode() {
  return randomBytes(10)
    .toString("hex")
    .toUpperCase()
    .match(/.{1,5}/g)
    .join("-");
}

function generateRecoveryCodes() {
  return Array.from({ length: recoveryCodeCount }, () => generateRecoveryCode());
}

async function findAdminByEmail(email, client) {
  const result = await client.query(
    `SELECT id, email, status
     FROM admin_users
     WHERE email = $1`,
    [email],
  );

  return result.rows[0] || null;
}

async function bootstrapAdminMfa() {
  const email = normalizeEmail(
    process.env.ADMIN_MFA_BOOTSTRAP_EMAIL || env.adminSeedEmail,
  );

  if (!email) {
    throw new Error(
      env.isProduction
        ? "ADMIN_MFA_BOOTSTRAP_EMAIL or ADMIN_SEED_EMAIL is required in production"
        : "ADMIN_MFA_BOOTSTRAP_EMAIL or ADMIN_SEED_EMAIL is required",
    );
  }

  const recoveryCodes = generateRecoveryCodes();
  const secret = generateTotpSecret();
  const encryptedSecret = encryptSensitiveValue(secret);

  const admin = await withTransaction(async (client) => {
    const existingAdmin = await findAdminByEmail(email, client);

    if (!existingAdmin) {
      throw new Error("Admin user not found for MFA bootstrap email");
    }

    if (existingAdmin.status !== "ACTIVE") {
      throw new Error("Admin user must be ACTIVE before MFA can be bootstrapped");
    }

    await client.query(
      `UPDATE admin_users
       SET mfa_secret_encrypted = $2,
           mfa_enabled = true,
           updated_at = now()
       WHERE id = $1`,
      [existingAdmin.id, encryptedSecret],
    );

    await client.query(
      `UPDATE admin_mfa_recovery_codes
       SET consumed_at = COALESCE(consumed_at, now())
       WHERE admin_user_id = $1
         AND consumed_at IS NULL`,
      [existingAdmin.id],
    );

    const codeRows = recoveryCodes.map((code) => ({
      id: randomUUID(),
      hash: hashRecoveryCode(code),
    }));

    await client.query(
      `INSERT INTO admin_mfa_recovery_codes (id, admin_user_id, code_hash)
       SELECT id, $1, code_hash
       FROM unnest($2::uuid[], $3::text[]) AS codes(id, code_hash)`,
      [
        existingAdmin.id,
        codeRows.map((row) => row.id),
        codeRows.map((row) => row.hash),
      ],
    );

    return existingAdmin;
  });

  const otpauthUrl = buildTotpUri({
    issuer: "GoldWallah",
    accountName: admin.email,
    secret,
  });

  console.log(JSON.stringify(
    {
      setupKey: secret,
      otpauthUrl,
      recoveryCodes,
    },
    null,
    2,
  ));
}

bootstrapAdminMfa()
  .catch((error) => {
    fail(error.message || "Unable to bootstrap admin MFA");
  })
  .finally(async () => {
    await pool.end();
  });
