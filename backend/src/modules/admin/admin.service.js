import { createHash, randomBytes } from "node:crypto";

import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

import { withTransaction } from "../../config/db.js";
import { env } from "../../config/env.js";
import {
  ADMIN_AUDIT_ACTIONS,
  writeAdminAuditLog,
} from "./admin.audit.js";
import {
  assignRolesToAdmin,
  countActiveSuperAdminsExcluding,
  createAdminSession,
  createAdminUser,
  findActiveAdminSessionByTokenHash,
  findAdminByEmail,
  findAdminById,
  findAdminPermissions,
  findAdminRoles,
  findAdminSessionByTokenHash,
  findRolesByIds,
  listSubAdmins,
  revokeAllActiveAdminSessions,
  revokeAdminSessionByTokenHash,
  updateAdminPassword,
  updateAdminFailedLogin,
  updateAdminLoginSuccess,
  updateAdminStatus,
  unlockExpiredAdminLock,
} from "./admin.repository.js";

function createError(message, statusCode, code) {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.code = code;
  return error;
}

function createGenericLoginError() {
  return createError("Invalid email or password", 401, "INVALID_CREDENTIALS");
}

export function hashRefreshToken(refreshToken) {
  return createHash("sha256").update(refreshToken).digest("hex");
}

function generateRefreshToken() {
  return randomBytes(48).toString("base64url");
}

function refreshTokenExpiry() {
  return new Date(
    Date.now() + env.adminRefreshTokenTtlDays * 24 * 60 * 60 * 1000,
  ).toISOString();
}

function createAccessToken(admin) {
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
    { expiresIn: env.adminAccessTokenTtl },
  );
}

async function hashPassword(password) {
  return bcrypt.hash(password, env.bcryptSaltRounds);
}

function sanitizeAdmin(admin, roles = [], permissions = []) {
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
  const [roles, permissions] = await Promise.all([
    findAdminRoles(admin.id, client),
    findAdminPermissions(admin.id, client),
  ]);

  return sanitizeAdmin(admin, roles, permissions);
}

async function createAdminAuthResponse({ admin, requestMeta, client }) {
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
  return (
    admin.status === "LOCKED" &&
    admin.lockedUntil &&
    new Date(admin.lockedUntil).getTime() > Date.now()
  );
}

async function writeLoginFailureAudit({ admin, email, reason, requestMeta }, client) {
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

export async function loginAdmin({ payload, requestMeta }) {
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
        email: payload.email,
        reason: "invalid_credentials",
        requestMeta,
      }, client);
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
  const refreshTokenHash = hashRefreshToken(refreshToken);

  await withTransaction(async (client) => {
    await revokeAdminSessionByTokenHash(refreshTokenHash, client);
    await writeAdminAuditLog(
      {
        actorAdminId: admin.id,
        action: ADMIN_AUDIT_ACTIONS.logout,
        resourceType: "ADMIN_SESSION",
        resourceId: admin.id,
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
  return {
    success: true,
    data: {
      admin: await buildAdminProfile(admin),
    },
  };
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

export async function createSubAdmin({ actorAdmin, payload, requestMeta }) {
  return withTransaction(async (client) => {
    const existing = await findAdminByEmail(payload.email, client);

    if (existing) {
      throw createError("Admin user already exists", 409, "ADMIN_EXISTS");
    }

    const roles = await findRolesByIds(payload.roleIds, client);

    if (roles.length !== payload.roleIds.length) {
      throw createError("One or more roles are invalid", 400, "INVALID_ROLES");
    }

    const admin = await createAdminUser(
      {
        name: payload.name,
        email: payload.email,
        passwordHash: await hashPassword(payload.password),
        isSuperAdmin: false,
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
      },
    };
  });
}

export async function changeAdminPassword({
  admin,
  payload,
  requestMeta,
}) {
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
