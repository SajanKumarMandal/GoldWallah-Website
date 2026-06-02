import { createHmac, randomBytes } from "node:crypto";

import { env } from "../config/env.js";

const identityHashVersion = "v2";

function getIdentityHashSecret() {
  if (!env.kycIdentityHashSecret && env.nodeEnv === "test") {
    return randomBytes(32).toString("base64url");
  }

  const secret = env.kycIdentityHashSecret?.trim();

  if (!secret || secret.length < 32) {
    throw new Error(
      "KYC_IDENTITY_HASH_SECRET must be at least 32 characters",
    );
  }

  return secret;
}

const identityHashSecret = getIdentityHashSecret();

function normalizeIdentityValue(value) {
  return String(value || "").trim().toUpperCase();
}

export function hashIdentityValue(value) {
  const normalizedValue = normalizeIdentityValue(value);
  const digest = createHmac("sha256", identityHashSecret)
    .update(normalizedValue)
    .digest("hex");

  return `${identityHashVersion}:${digest}`;
}
