import { createHmac, randomBytes } from "node:crypto";

const base32Alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

function base32Encode(buffer) {
  let bits = "";
  let output = "";

  for (const byte of buffer) {
    bits += byte.toString(2).padStart(8, "0");
  }

  for (let index = 0; index < bits.length; index += 5) {
    const chunk = bits.slice(index, index + 5).padEnd(5, "0");
    output += base32Alphabet[Number.parseInt(chunk, 2)];
  }

  return output;
}

function base32Decode(secret) {
  const normalizedSecret = String(secret || "")
    .toUpperCase()
    .replace(/[\s=]/g, "");
  let bits = "";

  for (const character of normalizedSecret) {
    const value = base32Alphabet.indexOf(character);

    if (value === -1) {
      throw new Error("Invalid TOTP secret");
    }

    bits += value.toString(2).padStart(5, "0");
  }

  const bytes = [];

  for (let index = 0; index + 8 <= bits.length; index += 8) {
    bytes.push(Number.parseInt(bits.slice(index, index + 8), 2));
  }

  return Buffer.from(bytes);
}

function hotp(secret, counter, digits) {
  const counterBuffer = Buffer.alloc(8);
  counterBuffer.writeBigUInt64BE(BigInt(counter));

  const digest = createHmac("sha1", base32Decode(secret))
    .update(counterBuffer)
    .digest();
  const offset = digest[digest.length - 1] & 0x0f;
  const binary =
    ((digest[offset] & 0x7f) << 24) |
    ((digest[offset + 1] & 0xff) << 16) |
    ((digest[offset + 2] & 0xff) << 8) |
    (digest[offset + 3] & 0xff);

  return String(binary % 10 ** digits).padStart(digits, "0");
}

export function generateTotpSecret() {
  return base32Encode(randomBytes(20));
}

export function verifyTotpCode(secret, code, options = {}) {
  const safeCode = String(code || "").trim();

  if (!/^\d{6}$/.test(safeCode)) {
    return false;
  }

  const digits = options.digits || 6;
  const stepSeconds = options.stepSeconds || 30;
  const window = options.window || 1;
  const currentCounter = Math.floor(Date.now() / 1000 / stepSeconds);

  for (let offset = -window; offset <= window; offset += 1) {
    if (hotp(secret, currentCounter + offset, digits) === safeCode) {
      return true;
    }
  }

  return false;
}

export function buildTotpUri({ issuer, accountName, secret }) {
  const label = `${issuer}:${accountName}`;
  const params = new URLSearchParams({
    secret,
    issuer,
    algorithm: "SHA1",
    digits: "6",
    period: "30",
  });

  return `otpauth://totp/${encodeURIComponent(label)}?${params.toString()}`;
}
