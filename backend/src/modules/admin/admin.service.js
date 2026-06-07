import { createHash, randomBytes } from "node:crypto";

import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

import { withTransaction } from "../../config/db.js";
import { env } from "../../config/env.js";
import {
  buildTotpUri,
  generateTotpSecret,
  verifyTotpCode,
} from "../../utils/totp.js";
import { revokeAllActiveRefreshTokens as revokeAllActiveUserRefreshTokens } from "../auth/auth.repository.js";
import {
  decryptSensitiveValue,
  encryptSensitiveValue,
} from "../kyc/kyc.encryption.js";
import { notifyUser } from "../notifications/notifications.service.js";
import {
  ADMIN_AUDIT_ACTIONS,
  writeAdminAuditLog,
} from "./admin.audit.js";
import { ADMIN_ROLES } from "./admin.permissions.js";
import {
  assignRolesToAdmin,
  countActiveSuperAdminsExcluding,
  createAdminSession,
  createAdminUser,
  findPlatformUserById,
  findActiveAdminSessionByTokenHash,
  findAdminByEmail,
  findAdminById,
  findAdminPermissions,
  findAdminRoles,
  findAdminSessionByTokenHash,
  findRolesByIds,
  listAdminRoles,
  listPlatformUsers,
  listSubAdmins,
  revokeAllActiveAdminSessions,
  revokeAdminSessionByTokenHash,
  updateAdminFailedLogin,
  updateAdminLoginSuccess,
  updateAdminMfaSecret,
  updateAdminPassword,
  updateAdminStatus,
  updatePlatformUserAccountStatus,
  unlockExpiredAdminLock,
} from "./admin.repository.js";

function createError(message, statusCode, code) {
  // Normalize admin service failures for the shared error handler.
  const error = new Error(message);
  error.statusCode = statusCode;
  error.code = code;
  return error;
}

function createGenericLoginError() {
  // Keep credential failures generic to avoid admin account enumeration.
  return createError("Invalid email or password", 401, "INVALID_CREDENTIALS");
}

export function hashRefreshToken(refreshToken) {
  // Admin refresh tokens are bearer credentials, so store only hashes in DB.
  return createHash("sha256").update(refreshToken).digest("hex");
}

function generateRefreshToken() {
  // High-entropy opaque token used only inside the admin HttpOnly cookie.
  return randomBytes(48).toString("base64url");
}

function refreshTokenExpiry() {
  // Persist absolute expiry for DB-side refresh-token validation.
  return new Date(
    Date.now() + env.adminRefreshTokenTtlDays * 24 * 60 * 60 * 1000,
  ).toISOString();
}

function isRecentlyRevoked(session) {
  // Avoid treating a near-simultaneous double refresh as token theft.
  if (!session?.revokedAt) {
    return false;
  }

  const revokedAtMs = new Date(session.revokedAt).getTime();
  const rotationGraceMs = 30 * 1000;

  return Number.isFinite(revokedAtMs) && Date.now() - revokedAtMs <= rotationGraceMs;
}

function createAccessToken(admin) {
  // Admin access tokens use a separate secret, audience, and token type from
  // seller/jeweller user tokens.
  if (!env.adminJwtAccessSecret && env.nodeEnv !== "test") {
    throw createError(
      "Admin authentication is not configured",
      500,
      "ADMIN_AUTH_NOT_CONFIGURED",
    );
  }

  return jwt.sign(
    {
      sub: admin.id,
      type: "admin",
    },
    env.adminJwtAccessSecret || "test-admin-secret",
    {
      expiresIn: env.adminAccessTokenTtl,
      issuer: "goldwallah-api",
      audience: "goldwallah-admin",
      algorithm: "HS256",
    },
  );
}

async function hashPassword(password) {
  // Admin passwords use the same bcrypt work factor configured for the app.
  return bcrypt.hash(password, env.bcryptSaltRounds);
}

function sanitizeAdmin(admin, roles = [], permissions = []) {
  // Remove sensitive fields such as password hashes and encrypted MFA secrets
  // before admin profiles leave the service layer.
  return {
    id: admin.id,
    name: admin.name,
    email: admin.email,
    status: admin.status,
    isSuperAdmin: admin.isSuperAdmin,
    mfaEnabled: admin.mfaEnabled,
    lastLoginAt: admin.lastLoginAt,
    passwordChangedAt: admin.passwordChangedAt,
    mustChangePassword: Boolean(admin.mustChangePassword),
    roles,
    permissions: admin.isSuperAdmin ? [] : permissions,
  };
}

async function buildAdminProfile(admin, client) {
  // Attach RBAC roles and permissions to the safe admin profile.
  const [roles, permissions] = await Promise.all([
    findAdminRoles(admin.id, client),
    findAdminPermissions(admin.id, client),
  ]);

  return sanitizeAdmin(admin, roles, permissions);
}

async function createAdminAuthResponse({ admin, requestMeta, client }) {
  // Shared admin session issuer for login and refresh rotation.
  const refreshToken = generateRefreshToken();
  const refreshTokenHash = hashRefreshToken(refreshToken);

  await createAdminSession(
    {
      adminUserId: admin.id,
      refreshTokenHash,
      ipAddress: requestMeta.ipAddress,
      userAgent: requestMeta.userAgent,
      expiresAt: refreshTokenExpiry(),
    },
    client,
  );

  return {
    success: true,
    data: {
      admin: await buildAdminProfile(admin, client),
      accessToken: createAccessToken(admin),
      refreshToken,
    },
  };
}

async function auditRefreshFailure(
  { action, session = null, reason, severity, requestMeta },
  client,
) {
  // Refresh failures are audited because they can indicate session theft or
  // automated attacks against admin accounts.
  await writeAdminAuditLog(
    {
      actorAdminId: session?.adminUserId || null,
      action,
      resourceType: "ADMIN_SESSION",
      resourceId: session?.id || null,
      reason,
      severity,
      requestMeta,
    },
    client,
  );
}

function isLockActive(admin) {
  // Locked admins stay blocked until lockedUntil has passed.
  return (
    admin.status === "LOCKED" &&
    admin.lockedUntil &&
    new Date(admin.lockedUntil).getTime() > Date.now()
  );
}

async function writeLoginFailureAudit({ admin, email, reason, requestMeta }, client) {
  // Audit every admin login failure, including unknown email attempts.
  await writeAdminAuditLog(
    {
      actorAdminId: admin?.id || null,
      action: ADMIN_AUDIT_ACTIONS.loginFailure,
      resourceType: "ADMIN_AUTH",
      resourceId: admin?.id || email,
      reason,
      severity: "WARNING",
      requestMeta,
    },
    client,
  );
}

async function recordAdminFailedLogin(admin, reason, requestMeta, client) {
  // Increment failed login count and calculate lock expiry when max attempts are hit.
  const lockUntil = new Date(
    Date.now() + env.adminLoginLockMinutes * 60 * 1000,
  ).toISOString();
  const updatedAdmin = await updateAdminFailedLogin(
    {
      id: admin.id,
      maxAttempts: env.adminLoginMaxAttempts,
      lockUntil,
    },
    client,
  );

  await writeLoginFailureAudit({
    admin: updatedAdmin || admin,
    email: admin.email,
    reason,
    requestMeta,
  }, client);
}

function verifyAdminMfa(admin, mfaCode) {
  // TOTP verification decrypts the stored secret only long enough to verify the code.
  if (!admin.mfaSecretEncrypted) {
    return false;
  }

  return verifyTotpCode(decryptSensitiveValue(admin.mfaSecretEncrypted), mfaCode);
}

export async function loginAdmin({ payload, requestMeta }) {
  // Admin login handles credential checks, lockouts, MFA policy, audit logs, and
  // session issuance in a single transaction.
  return withTransaction(async (client) => {
    let admin = await findAdminByEmail(payload.email, client);

    if (!admin) {
      await writeLoginFailureAudit({
        admin: null,
        email: payload.email,
        reason: "invalid_credentials",
        requestMeta,
      }, client);
      throw createGenericLoginError();
    }

    const unlockedAdmin = await unlockExpiredAdminLock(admin.id, client);

    if (unlockedAdmin) {
      // Expired locks are cleared before evaluating the current login attempt.
      admin = unlockedAdmin;
    }

    if (admin.status === "SUSPENDED" || isLockActive(admin)) {
      await writeLoginFailureAudit({
        admin,
        email: payload.email,
        reason: "admin_not_active",
        requestMeta,
      }, client);
      throw createGenericLoginError();
    }

    const isPasswordValid = await bcrypt.compare(
      payload.password,
      admin.passwordHash,
    );

    if (!isPasswordValid) {
      // Wrong password can advance failed-attempt lockout state.
      await recordAdminFailedLogin(admin, "invalid_credentials", requestMeta, client);
      throw createGenericLoginError();
    }

    if (!admin.mfaEnabled && env.adminMfaRequired) {
      // Production can require MFA for all admins before login is allowed.
      await writeLoginFailureAudit({
        admin,
        email: payload.email,
        reason: "mfa_not_configured",
        requestMeta,
      }, client);
      throw createError(
        "Admin MFA must be configured before login",
        403,
        "ADMIN_MFA_NOT_CONFIGURED",
      );
    }

    if (admin.mfaEnabled && !payload.mfaCode) {
      // MFA-enabled admins must provide a current TOTP code.
      await writeLoginFailureAudit({
        admin,
        email: payload.email,
        reason: "mfa_code_required",
        requestMeta,
      }, client);
      throw createError("MFA code is required", 401, "ADMIN_MFA_REQUIRED");
    }

    if (admin.mfaEnabled && !verifyAdminMfa(admin, payload.mfaCode)) {
      // Invalid MFA codes are treated like failed login attempts.
      await recordAdminFailedLogin(admin, "invalid_mfa_code", requestMeta, client);
      throw createGenericLoginError();
    }

    const loggedInAdmin = await updateAdminLoginSuccess(
      { id: admin.id, ipAddress: requestMeta.ipAddress },
      client,
    );

    await writeAdminAuditLog(
      {
        actorAdminId: admin.id,
        action: ADMIN_AUDIT_ACTIONS.loginSuccess,
        resourceType: "ADMIN_AUTH",
        resourceId: admin.id,
        requestMeta,
      },
      client,
    );

    return createAdminAuthResponse({
      admin: loggedInAdmin,
      requestMeta,
      client,
    });
  });
}

export async function refreshAdminSession({ refreshToken, requestMeta }) {
  // Rotate admin refresh tokens atomically and audit invalid/reused tokens.
  const refreshTokenHash = hashRefreshToken(refreshToken);

  return withTransaction(async (client) => {
    const existingSession = await findAdminSessionByTokenHash(
      refreshTokenHash,
      client,
    );

    if (!existingSession) {
      await auditRefreshFailure(
        {
          action: ADMIN_AUDIT_ACTIONS.refreshInvalid,
          reason: "refresh_token_not_found",
          severity: "WARNING",
          requestMeta,
        },
        client,
      );
      throw createError("Invalid refresh token", 401, "INVALID_REFRESH_TOKEN");
    }

    if (existingSession.revokedAt) {
      // Reuse of a revoked refresh token outside the grace window revokes the
      // admin's entire session family.
      if (isRecentlyRevoked(existingSession)) {
        await auditRefreshFailure(
          {
            action: ADMIN_AUDIT_ACTIONS.refreshInvalid,
            session: existingSession,
            reason: "recently_rotated_refresh_token_reused",
            severity: "WARNING",
            requestMeta,
          },
          client,
        );
        throw createError("Invalid refresh token", 401, "INVALID_REFRESH_TOKEN");
      }

      await revokeAllActiveAdminSessions(existingSession.adminUserId, client);
      await auditRefreshFailure(
        {
          action: ADMIN_AUDIT_ACTIONS.refreshReuseDetected,
          session: existingSession,
          reason: "revoked_refresh_token_reused",
          severity: "CRITICAL",
          requestMeta,
        },
        client,
      );
      throw createError("Invalid refresh token", 401, "INVALID_REFRESH_TOKEN");
    }

    if (new Date(existingSession.expiresAt).getTime() <= Date.now()) {
      // Expired refresh attempts are audited and rejected.
      await auditRefreshFailure(
        {
          action: ADMIN_AUDIT_ACTIONS.refreshExpired,
          session: existingSession,
          reason: "refresh_token_expired",
          severity: "WARNING",
          requestMeta,
        },
        client,
      );
      throw createError("Invalid refresh token", 401, "INVALID_REFRESH_TOKEN");
    }

    const session = await findActiveAdminSessionByTokenHash(refreshTokenHash, client);

    if (!session) {
      await auditRefreshFailure(
        {
          action: ADMIN_AUDIT_ACTIONS.refreshInvalid,
          session: existingSession,
          reason: "refresh_token_not_active",
          severity: "WARNING",
          requestMeta,
        },
        client,
      );
      throw createError("Invalid refresh token", 401, "INVALID_REFRESH_TOKEN");
    }

    const admin = await findAdminById(session.adminUserId, client);

    if (!admin || admin.status !== "ACTIVE") {
      // Inactive admins cannot rotate sessions even with an otherwise valid token.
      await auditRefreshFailure(
        {
          action: ADMIN_AUDIT_ACTIONS.refreshBlockedInactiveAdmin,
          session,
          reason: "admin_not_active",
          severity: "WARNING",
          requestMeta,
        },
        client,
      );
      throw createError("Invalid refresh token", 401, "INVALID_REFRESH_TOKEN");
    }

    await revokeAdminSessionByTokenHash(refreshTokenHash, client);
    const response = await createAdminAuthResponse({ admin, requestMeta, client });

    await writeAdminAuditLog(
      {
        actorAdminId: admin.id,
        action: ADMIN_AUDIT_ACTIONS.refreshRotated,
        resourceType: "ADMIN_SESSION",
        resourceId: session.id,
        requestMeta,
      },
      client,
    );

    return response;
  });
}

export async function logoutAdmin({ admin, refreshToken, requestMeta }) {
  // Logout revokes the refresh token hash and records an audit event.
  const refreshTokenHash = hashRefreshToken(refreshToken);

  await withTransaction(async (client) => {
    const session = await findAdminSessionByTokenHash(refreshTokenHash, client);

    await revokeAdminSessionByTokenHash(refreshTokenHash, client);
    await writeAdminAuditLog(
      {
        actorAdminId: admin?.id || session?.adminUserId || null,
        action: ADMIN_AUDIT_ACTIONS.logout,
        resourceType: "ADMIN_SESSION",
        resourceId: session?.id || admin?.id || null,
        requestMeta,
      },
      client,
    );
  });

  return {
    success: true,
    message: "Logged out successfully",
  };
}

export async function getCurrentAdmin(admin) {
  // Return current verified admin profile for route guards and admin UI chrome.
  return {
    success: true,
    data: {
      admin: await buildAdminProfile(admin),
    },
  };
}

export async function beginAdminMfaSetup({ admin, payload, requestMeta }) {
  // MFA enrollment starts only after the current password is confirmed.
  return withTransaction(async (client) => {
    const currentAdmin = await findAdminById(admin.id, client, {
      includeSensitive: true,
    });

    if (!currentAdmin || currentAdmin.status !== "ACTIVE") {
      throw createError("Unauthorized", 401, "ADMIN_UNAUTHORIZED");
    }

    const isPasswordValid = await bcrypt.compare(
      payload.currentPassword,
      currentAdmin.passwordHash,
    );

    if (!isPasswordValid) {
      throw createError("Invalid current password", 400, "INVALID_PASSWORD");
    }

    const secret = generateTotpSecret();

    // Store encrypted secret as disabled until the admin confirms a valid TOTP.
    await updateAdminMfaSecret(
      {
        id: admin.id,
        mfaSecretEncrypted: encryptSensitiveValue(secret),
        mfaEnabled: false,
      },
      client,
    );
    await writeAdminAuditLog(
      {
        actorAdminId: admin.id,
        action: ADMIN_AUDIT_ACTIONS.mfaSetupStarted,
        resourceType: "ADMIN_USER",
        resourceId: admin.id,
        severity: "WARNING",
        requestMeta,
      },
      client,
    );

    return {
      success: true,
      message: "MFA setup started",
      data: {
        secret,
        otpauthUrl: buildTotpUri({
          issuer: "GoldWallah",
          accountName: currentAdmin.email,
          secret,
        }),
      },
    };
  });
}

export async function confirmAdminMfaSetup({ admin, payload, requestMeta }) {
  // MFA confirmation enables the encrypted secret only after code verification.
  return withTransaction(async (client) => {
    const currentAdmin = await findAdminById(admin.id, client, {
      includeSensitive: true,
    });

    if (!currentAdmin || currentAdmin.status !== "ACTIVE") {
      throw createError("Unauthorized", 401, "ADMIN_UNAUTHORIZED");
    }

    if (!verifyAdminMfa(currentAdmin, payload.mfaCode)) {
      throw createError("Invalid MFA code", 400, "INVALID_MFA_CODE");
    }

    const updatedAdmin = await updateAdminMfaSecret(
      {
        id: admin.id,
        mfaSecretEncrypted: currentAdmin.mfaSecretEncrypted,
        mfaEnabled: true,
      },
      client,
    );

    await writeAdminAuditLog(
      {
        actorAdminId: admin.id,
        action: ADMIN_AUDIT_ACTIONS.mfaEnabled,
        resourceType: "ADMIN_USER",
        resourceId: admin.id,
        severity: "WARNING",
        requestMeta,
      },
      client,
    );

    return {
      success: true,
      message: "MFA enabled",
      data: {
        admin: sanitizeAdmin(
          updatedAdmin,
          await findAdminRoles(updatedAdmin.id, client),
          await findAdminPermissions(updatedAdmin.id, client),
        ),
      },
    };
  });
}

export async function getSubAdmins() {
  const admins = await listSubAdmins();
  const enrichedAdmins = await Promise.all(
    admins.map(async (admin) => ({
      ...sanitizeAdmin(
        admin,
        await findAdminRoles(admin.id),
        await findAdminPermissions(admin.id),
      ),
    })),
  );

  return {
    success: true,
    data: enrichedAdmins,
  };
}

function encodePlatformUserCursor(row) {
  if (!row?.created_at || !row?.id) {
    return null;
  }

  return Buffer.from(
    JSON.stringify({
      createdAt: row.created_at,
      id: row.id,
    }),
  ).toString("base64url");
}

function decodePlatformUserCursor(cursor) {
  if (!cursor) {
    return null;
  }

  try {
    const parsed = JSON.parse(Buffer.from(cursor, "base64url").toString("utf8"));

    if (
      !parsed?.createdAt ||
      Number.isNaN(Date.parse(parsed.createdAt)) ||
      !/^[0-9a-fA-F-]{36}$/.test(parsed.id || "")
    ) {
      throw new Error("Invalid cursor");
    }

    return parsed;
  } catch {
    throw createError("Invalid cursor", 400, "INVALID_CURSOR");
  }
}

export async function getAdminRoles() {
  return {
    success: true,
    data: await listAdminRoles(),
  };
}

export async function getPlatformUsers(filters = {}) {
  const result = await listPlatformUsers({
    ...filters,
    cursor: decodePlatformUserCursor(filters.cursor),
  });

  return {
    success: true,
    data: {
      users: result.users,
      nextCursor: encodePlatformUserCursor(result.nextCursor),
      hasMore: result.hasMore,
    },
  };
}

export async function blockPlatformUser({
  actorAdmin,
  userId,
  payload,
  requestMeta,
}) {
  return withTransaction(async (client) => {
    const existing = await findPlatformUserById(userId, client);

    if (!existing) {
      throw createError("User not found", 404, "USER_NOT_FOUND");
    }

    if (existing.accountStatus === "SUSPENDED") {
      throw createError("User account is already blocked", 409, "USER_ALREADY_BLOCKED");
    }

    const updatedUser = await updatePlatformUserAccountStatus(
      { userId, accountStatus: "SUSPENDED" },
      client,
    );

    await revokeAllActiveUserRefreshTokens(userId, client);
    await notifyUser(
      {
        userId,
        type: "ACCOUNT_SUSPENDED",
        title: "Account access suspended",
        body: "Your GoldWallah account access was suspended by platform administration.",
        entityType: "USER_ACCOUNT",
        entityId: userId,
      },
      client,
    );

    await writeAdminAuditLog(
      {
        actorAdminId: actorAdmin.id,
        action: ADMIN_AUDIT_ACTIONS.userBlocked,
        resourceType: "USER",
        resourceId: userId,
        oldValue: { accountStatus: existing.accountStatus },
        newValue: { accountStatus: updatedUser.accountStatus },
        reason: payload.reason,
        severity: "WARNING",
        requestMeta,
      },
      client,
    );

    return {
      success: true,
      message: "User account blocked",
      data: updatedUser,
    };
  });
}

export async function unblockPlatformUser({
  actorAdmin,
  userId,
  payload,
  requestMeta,
}) {
  return withTransaction(async (client) => {
    const existing = await findPlatformUserById(userId, client);

    if (!existing) {
      throw createError("User not found", 404, "USER_NOT_FOUND");
    }

    if (existing.accountStatus === "ACTIVE") {
      throw createError("User account is already active", 409, "USER_ALREADY_ACTIVE");
    }

    const updatedUser = await updatePlatformUserAccountStatus(
      { userId, accountStatus: "ACTIVE" },
      client,
    );
    await notifyUser(
      {
        userId,
        type: "ACCOUNT_REACTIVATED",
        title: "Account access restored",
        body: "Your GoldWallah account access was restored by platform administration.",
        entityType: "USER_ACCOUNT",
        entityId: userId,
      },
      client,
    );

    await writeAdminAuditLog(
      {
        actorAdminId: actorAdmin.id,
        action: ADMIN_AUDIT_ACTIONS.userUnblocked,
        resourceType: "USER",
        resourceId: userId,
        oldValue: { accountStatus: existing.accountStatus },
        newValue: { accountStatus: updatedUser.accountStatus },
        reason: payload.reason,
        severity: "INFO",
        requestMeta,
      },
      client,
    );

    return {
      success: true,
      message: "User account unblocked",
      data: updatedUser,
    };
  });
}

export async function createSubAdmin({ actorAdmin, payload, requestMeta }) {
  // Sub-admin creation is part of admin access management: create account, assign
  // roles, and audit the operation atomically.
  return withTransaction(async (client) => {
    const existing = await findAdminByEmail(payload.email, client);

    if (existing) {
      throw createError("Admin user already exists", 409, "ADMIN_EXISTS");
    }

    const roles = await findRolesByIds(payload.roleIds, client);

    if (roles.length !== payload.roleIds.length) {
      throw createError("One or more roles are invalid", 400, "INVALID_ROLES");
    }

    if (roles.some((role) => role.name === ADMIN_ROLES.superAdmin)) {
      throw createError(
        "Super admin role cannot be assigned through sub-admin creation",
        403,
        "SUPER_ADMIN_ROLE_ASSIGNMENT_DENIED",
      );
    }

    const mfaSecret = env.adminMfaRequired ? generateTotpSecret() : "";
    const admin = await createAdminUser(
      {
        name: payload.name,
        email: payload.email,
        passwordHash: await hashPassword(payload.password),
        isSuperAdmin: false,
        mfaEnabled: Boolean(mfaSecret),
        mfaSecretEncrypted: mfaSecret ? encryptSensitiveValue(mfaSecret) : null,
        mustChangePassword: true,
        passwordChangedAt: null,
        createdBy: actorAdmin.id,
      },
      client,
    );

    await assignRolesToAdmin(admin.id, payload.roleIds, client);
    await writeAdminAuditLog(
      {
        actorAdminId: actorAdmin.id,
        action: ADMIN_AUDIT_ACTIONS.subAdminCreated,
        resourceType: "ADMIN_USER",
        resourceId: admin.id,
        newValue: {
          id: admin.id,
          email: admin.email,
          roleIds: payload.roleIds,
        },
        requestMeta,
      },
      client,
    );
    await writeAdminAuditLog(
      {
        actorAdminId: actorAdmin.id,
        action: ADMIN_AUDIT_ACTIONS.rolesAssigned,
        resourceType: "ADMIN_USER",
        resourceId: admin.id,
        newValue: { roleIds: payload.roleIds },
        requestMeta,
      },
      client,
    );

    return {
      success: true,
      data: {
        admin: sanitizeAdmin(admin, roles, []),
        mfaSetup: mfaSecret
          ? {
              secret: mfaSecret,
              otpauthUrl: buildTotpUri({
                issuer: "GoldWallah",
                accountName: admin.email,
                secret: mfaSecret,
              }),
            }
          : null,
      },
    };
  });
}

export async function changeAdminPassword({
  admin,
  payload,
  requestMeta,
}) {
  // Password changes verify the current password, update the hash, revoke every
  // active admin session, and force a fresh login.
  return withTransaction(async (client) => {
    const currentAdmin = await findAdminById(admin.id, client, {
      includeSensitive: true,
    });

    if (!currentAdmin || currentAdmin.status !== "ACTIVE") {
      throw createError("Unauthorized", 401, "ADMIN_UNAUTHORIZED");
    }

    const isPasswordValid = await bcrypt.compare(
      payload.currentPassword,
      currentAdmin.passwordHash,
    );

    if (!isPasswordValid) {
      throw createError("Invalid current password", 400, "INVALID_PASSWORD");
    }

    const updatedAdmin = await updateAdminPassword(
      {
        id: admin.id,
        passwordHash: await hashPassword(payload.newPassword),
        mustChangePassword: false,
      },
      client,
    );

    await revokeAllActiveAdminSessions(admin.id, client);
    await writeAdminAuditLog(
      {
        actorAdminId: admin.id,
        action: ADMIN_AUDIT_ACTIONS.passwordChanged,
        resourceType: "ADMIN_USER",
        resourceId: admin.id,
        requestMeta,
      },
      client,
    );

    return {
      success: true,
      message: "Password changed successfully. Please login again.",
      data: {
        admin: sanitizeAdmin(
          updatedAdmin,
          await findAdminRoles(updatedAdmin.id, client),
          await findAdminPermissions(updatedAdmin.id, client),
        ),
      },
    };
  });
}

export async function updateSubAdminStatus({
  actorAdmin,
  adminId,
  payload,
  requestMeta,
}) {
  if (actorAdmin.id === adminId) {
    throw createError("Admins cannot suspend themselves", 400, "SELF_SUSPEND_DENIED");
  }

  return withTransaction(async (client) => {
    const targetAdmin = await findAdminById(adminId, client);

    if (!targetAdmin) {
      throw createError("Admin user not found", 404, "ADMIN_NOT_FOUND");
    }

    if (
      targetAdmin.isSuperAdmin &&
      payload.status !== "ACTIVE" &&
      (await countActiveSuperAdminsExcluding(adminId, client)) === 0
    ) {
      throw createError(
        "Cannot suspend or lock the last active super admin",
        409,
        "LAST_SUPER_ADMIN",
      );
    }

    const updatedAdmin = await updateAdminStatus(
      { id: adminId, status: payload.status },
      client,
    );

    await writeAdminAuditLog(
      {
        actorAdminId: actorAdmin.id,
        action: ADMIN_AUDIT_ACTIONS.adminStatusUpdated,
        resourceType: "ADMIN_USER",
        resourceId: adminId,
        oldValue: { status: targetAdmin.status },
        newValue: { status: updatedAdmin.status },
        reason: payload.reason,
        severity: payload.status === "ACTIVE" ? "INFO" : "WARNING",
        requestMeta,
      },
      client,
    );

    return {
      success: true,
      data: {
        admin: sanitizeAdmin(
          updatedAdmin,
          await findAdminRoles(updatedAdmin.id, client),
          await findAdminPermissions(updatedAdmin.id, client),
        ),
      },
    };
  });
}
