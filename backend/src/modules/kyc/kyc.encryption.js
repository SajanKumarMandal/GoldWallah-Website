import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

import { env } from "../../config/env.js";

const algorithm = "aes-256-gcm";
const ivLength = 12;
const authTagLength = 16;

function getEncryptionKey() {
  const configuredKey = env.kycEncryptionKey;

  if (!configuredKey && env.nodeEnv === "test") {
    return randomBytes(32);
  }

  const trimmedKey = configuredKey.trim();
  const decodedKey = /^[a-f0-9]{64}$/i.test(trimmedKey)
    ? Buffer.from(trimmedKey, "hex")
    : Buffer.from(trimmedKey, "base64");

  if (decodedKey.length !== 32) {
    throw new Error(
      "KYC_ENCRYPTION_KEY must be a 32-byte key encoded as base64 or 64-character hex",
    );
  }

  return decodedKey;
}

const encryptionKey = getEncryptionKey();

export function encryptSensitiveValue(value) {
  const iv = randomBytes(ivLength);
  const cipher = createCipheriv(algorithm, encryptionKey, iv, {
    authTagLength,
  });
  const encrypted = Buffer.concat([
    cipher.update(value, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  return [
    "v1",
    iv.toString("base64url"),
    authTag.toString("base64url"),
    encrypted.toString("base64url"),
  ].join(":");
}

export function decryptSensitiveValue(encryptedValue) {
  if (!encryptedValue) {
    return null;
  }

  const [version, iv, authTag, encrypted] = encryptedValue.split(":");

  if (version !== "v1" || !iv || !authTag || !encrypted) {
    throw new Error("Invalid encrypted KYC value");
  }

  const decipher = createDecipheriv(
    algorithm,
    encryptionKey,
    Buffer.from(iv, "base64url"),
    { authTagLength },
  );
  decipher.setAuthTag(Buffer.from(authTag, "base64url"));

  return Buffer.concat([
    decipher.update(Buffer.from(encrypted, "base64url")),
    decipher.final(),
  ]).toString("utf8");
}
