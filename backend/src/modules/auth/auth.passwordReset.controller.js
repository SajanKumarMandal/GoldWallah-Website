import { createHash, randomBytes } from "node:crypto";

import bcrypt from "bcryptjs";
import { z } from "zod";

import { query, withTransaction } from "../../config/db.js";
import { env } from "../../config/env.js";

const TOKEN_BYTES = 32;
const RESET_TOKEN_TTL_MINUTES = 15;

const passwordResetRequestSchema = z.object({
  email: z.string().trim().email().transform((email) => email.toLowerCase()),
});

const passwordResetConfirmSchema = z.object({
  token: z.string().trim().min(32, "Reset token is required"),
  password: z
    .string()
    .min(10, "Password must be at least 10 characters")
    .max(128, "Password is too long")
    .refine((value) => !/^\s|\s$/.test(value), "Password cannot start or end with spaces"),
});

function createError(message, statusCode, code) {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.code = code;
  return error;
}

function validateBody(schema, body) {
  const result = schema.safeParse(body);

  if (!result.success) {
    const error = createError("Invalid request body", 400, "VALIDATION_ERROR");
    error.details = result.error.flatten().fieldErrors;
    throw error;
  }

  return result.data;
}

function hashToken(token) {
  return createHash("sha256").update(token).digest("hex");
}

function success(message, data) {
  return {
    success: true,
    message,
    ...(data ? { data } : {}),
  };
}

export async function requestPasswordReset(request, response, next) {
  try {
    const { email } = validateBody(passwordResetRequestSchema, request.body);
    const userResult = await query(
      `SELECT id, account_status
       FROM users
       WHERE email = $1
         AND password_hash IS NOT NULL`,
      [email],
    );
    const user = userResult.rows[0];

    if (!user || user.account_status !== "ACTIVE") {
      response.status(200).json(
        success("If an account exists, a password reset link will be sent."),
      );
      return;
    }

    const plainToken = randomBytes(TOKEN_BYTES).toString("base64url");
    const tokenHash = hashToken(plainToken);
    const expiresAt = new Date(
      Date.now() + RESET_TOKEN_TTL_MINUTES * 60 * 1000,
    ).toISOString();

    await withTransaction(async (client) => {
      await client.query(
        `UPDATE password_reset_tokens
         SET consumed_at = COALESCE(consumed_at, now())
         WHERE user_id = $1
           AND consumed_at IS NULL`,
        [user.id],
      );
      await client.query(
        `INSERT INTO password_reset_tokens (id, user_id, token_hash, expires_at)
         VALUES (gen_random_uuid(), $1, $2, $3)`,
        [user.id, tokenHash, expiresAt],
      );
    });

    const resetUrl = `${env.frontendUrl}/reset-password?token=${encodeURIComponent(plainToken)}`;

    request.log?.info?.({ email, resetUrl }, "Password reset link generated");
    response.status(200).json(
      success("If an account exists, a password reset link will be sent.", {
        expiresInMinutes: RESET_TOKEN_TTL_MINUTES,
      }),
    );
  } catch (error) {
    next(error);
  }
}

export async function confirmPasswordReset(request, response, next) {
  try {
    const { token, password } = validateBody(passwordResetConfirmSchema, request.body);
    const tokenHash = hashToken(token);
    const passwordHash = await bcrypt.hash(password, env.bcryptSaltRounds);

    await withTransaction(async (client) => {
      const resetResult = await client.query(
        `SELECT password_reset_tokens.id,
                password_reset_tokens.user_id,
                users.account_status
         FROM password_reset_tokens
         INNER JOIN users ON users.id = password_reset_tokens.user_id
         WHERE password_reset_tokens.token_hash = $1
           AND password_reset_tokens.consumed_at IS NULL
           AND password_reset_tokens.expires_at > now()
         LIMIT 1`,
        [tokenHash],
      );
      const resetRecord = resetResult.rows[0];

      if (!resetRecord || resetRecord.account_status !== "ACTIVE") {
        throw createError("Invalid or expired reset link", 400, "INVALID_RESET_TOKEN");
      }

      await client.query(
        `UPDATE users
         SET password_hash = $1,
             updated_at = now()
         WHERE id = $2`,
        [passwordHash, resetRecord.user_id],
      );
      await client.query(
        `UPDATE password_reset_tokens
         SET consumed_at = now()
         WHERE id = $1`,
        [resetRecord.id],
      );
      await client.query(
        `UPDATE refresh_tokens
         SET revoked_at = COALESCE(revoked_at, now())
         WHERE user_id = $1
           AND revoked_at IS NULL`,
        [resetRecord.user_id],
      );
    });

    response.status(200).json(
      success("Password reset successfully. Please sign in with your new password."),
    );
  } catch (error) {
    next(error);
  }
}
