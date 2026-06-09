import { createHash } from "node:crypto";

import bcrypt from "bcryptjs";
import { beforeEach, describe, expect, it, vi } from "vitest";

const repo = vi.hoisted(() => ({
  assignRolesToAdmin: vi.fn(),
  countActiveSuperAdminsExcluding: vi.fn(),
  createAdminAuditLog: vi.fn(),
  createAdminSession: vi.fn(),
  createAdminUser: vi.fn(),
  consumeAdminRecoveryCode: vi.fn(),
  findActiveAdminSessionByTokenHash: vi.fn(),
  findAdminByEmail: vi.fn(),
  findAdminById: vi.fn(),
  findAdminPermissions: vi.fn(),
  findAdminRoles: vi.fn(),
  findAdminSessionByTokenHash: vi.fn(),
  findPlatformUserById: vi.fn(),
  findRolesByIds: vi.fn(),
  listAdminRoles: vi.fn(),
  listPlatformUsers: vi.fn(),
  listSubAdmins: vi.fn(),
  replaceAdminRecoveryCodes: vi.fn(),
  revokeAdminSessionByTokenHash: vi.fn(),
  revokeAllActiveAdminSessions: vi.fn(),
  unlockExpiredAdminLock: vi.fn(),
  updateAdminFailedLogin: vi.fn(),
  updateAdminLoginSuccess: vi.fn(),
  updateAdminMfaSecret: vi.fn(),
  updateAdminPassword: vi.fn(),
  updateAdminStatus: vi.fn(),
  updatePlatformUserAccountStatus: vi.fn(),
}));

const totp = vi.hoisted(() => ({
  buildTotpUri: vi.fn(() => "otpauth://totp/GoldWallah:test"),
  generateTotpSecret: vi.fn(() => "BASE32SECRET"),
  verifyTotpCode: vi.fn(),
}));

vi.mock("../src/config/env.js", () => ({
  env: {
    nodeEnv: "test",
    isProduction: false,
    adminJwtAccessSecret: "admin-access-secret-32-characters-long",
    adminAccessTokenTtl: "15m",
    adminRefreshTokenTtlDays: 7,
    adminLoginMaxAttempts: 5,
    adminLoginLockMinutes: 15,
    adminMfaRequired: true,
    bcryptSaltRounds: 4,
  },
}));

vi.mock("../src/config/db.js", () => ({
  withTransaction: async (callback) => callback({ query: vi.fn() }),
}));

vi.mock("../src/modules/admin/admin.repository.js", () => repo);
vi.mock("../src/utils/totp.js", () => totp);
vi.mock("../src/modules/kyc/kyc.encryption.js", () => ({
  decryptSensitiveValue: (value) => value,
  encryptSensitiveValue: (value) => `encrypted:${value}`,
}));
vi.mock("../src/modules/auth/auth.repository.js", () => ({
  revokeAllActiveRefreshTokens: vi.fn(),
}));
vi.mock("../src/modules/notifications/notifications.service.js", () => ({
  notifyUser: vi.fn(),
}));

const requestMeta = {
  ipAddress: "127.0.0.1",
  userAgent: "vitest",
  requestId: "test-request",
};

function hashRecoveryCode(code) {
  return createHash("sha256")
    .update(String(code).replace(/-/g, "").toUpperCase())
    .digest("hex");
}

async function buildAdmin(overrides = {}) {
  return {
    id: "11111111-1111-1111-1111-111111111111",
    name: "Root Admin",
    email: "admin@goldwallah.test",
    status: "ACTIVE",
    isSuperAdmin: true,
    mfaEnabled: true,
    mfaSecretEncrypted: "BASE32SECRET",
    passwordHash: await bcrypt.hash("AdminPass123!", 4),
    ...overrides,
  };
}

function primeSuccessfulSession(admin) {
  repo.unlockExpiredAdminLock.mockResolvedValue(null);
  repo.updateAdminLoginSuccess.mockResolvedValue(admin);
  repo.createAdminSession.mockResolvedValue({ id: "session-1" });
  repo.findAdminRoles.mockResolvedValue([]);
  repo.findAdminPermissions.mockResolvedValue([]);
  repo.createAdminAuditLog.mockResolvedValue({});
  repo.updateAdminFailedLogin.mockResolvedValue(admin);
}

describe("admin MFA service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("requires MFA for MFA-enabled admins", async () => {
    const { loginAdmin } = await import("../src/modules/admin/admin.service.js");
    const admin = await buildAdmin();
    primeSuccessfulSession(admin);
    repo.findAdminByEmail.mockResolvedValue(admin);

    await expect(
      loginAdmin({
        payload: {
          email: admin.email,
          password: "AdminPass123!",
        },
        requestMeta,
      }),
    ).rejects.toMatchObject({ code: "ADMIN_MFA_REQUIRED" });

    expect(repo.createAdminSession).not.toHaveBeenCalled();
  });

  it("rejects invalid TOTP and records a failed admin login", async () => {
    const { loginAdmin } = await import("../src/modules/admin/admin.service.js");
    const admin = await buildAdmin();
    primeSuccessfulSession(admin);
    repo.findAdminByEmail.mockResolvedValue(admin);
    totp.verifyTotpCode.mockReturnValue(false);

    await expect(
      loginAdmin({
        payload: {
          email: admin.email,
          password: "AdminPass123!",
          mfaCode: "111111",
        },
        requestMeta,
      }),
    ).rejects.toMatchObject({ code: "INVALID_CREDENTIALS" });

    expect(repo.updateAdminFailedLogin).toHaveBeenCalled();
    expect(repo.createAdminSession).not.toHaveBeenCalled();
    expect(repo.createAdminAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: "ADMIN_MFA_FAILED" }),
      expect.anything(),
    );
  });

  it("accepts a valid TOTP and creates an admin session", async () => {
    const { loginAdmin } = await import("../src/modules/admin/admin.service.js");
    const admin = await buildAdmin();
    primeSuccessfulSession(admin);
    repo.findAdminByEmail.mockResolvedValue(admin);
    totp.verifyTotpCode.mockReturnValue(true);

    const result = await loginAdmin({
      payload: {
        email: admin.email,
        password: "AdminPass123!",
        mfaCode: "123456",
      },
      requestMeta,
    });

    expect(result.success).toBe(true);
    expect(result.data.accessToken).toEqual(expect.any(String));
    expect(repo.createAdminSession).toHaveBeenCalled();
    expect(repo.consumeAdminRecoveryCode).not.toHaveBeenCalled();
    expect(repo.createAdminAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: "ADMIN_MFA_SUCCESS" }),
      expect.anything(),
    );
  });

  it("accepts a recovery code exactly once", async () => {
    const { loginAdmin } = await import("../src/modules/admin/admin.service.js");
    const admin = await buildAdmin();
    primeSuccessfulSession(admin);
    repo.findAdminByEmail.mockResolvedValue(admin);
    repo.consumeAdminRecoveryCode
      .mockResolvedValueOnce({ id: "code-1", adminUserId: admin.id })
      .mockResolvedValueOnce(null);

    const payload = {
      email: admin.email,
      password: "AdminPass123!",
      recoveryCode: "ABCDE-F1234-56789-0ABCD",
    };

    await expect(loginAdmin({ payload, requestMeta })).resolves.toMatchObject({
      success: true,
    });
    await expect(loginAdmin({ payload, requestMeta })).rejects.toMatchObject({
      code: "INVALID_CREDENTIALS",
    });

    expect(repo.consumeAdminRecoveryCode).toHaveBeenCalledWith(
      admin.id,
      hashRecoveryCode(payload.recoveryCode),
      expect.anything(),
    );
  });

  it("stores only hashed recovery codes when MFA setup is confirmed", async () => {
    const { confirmAdminMfaSetup } = await import(
      "../src/modules/admin/admin.service.js"
    );
    const admin = await buildAdmin({ mfaEnabled: false });
    const updatedAdmin = { ...admin, mfaEnabled: true };
    repo.findAdminById.mockResolvedValue(admin);
    repo.updateAdminMfaSecret.mockResolvedValue(updatedAdmin);
    repo.findAdminRoles.mockResolvedValue([]);
    repo.findAdminPermissions.mockResolvedValue([]);
    repo.createAdminAuditLog.mockResolvedValue({});
    totp.verifyTotpCode.mockReturnValue(true);

    const result = await confirmAdminMfaSetup({
      admin,
      payload: { mfaCode: "123456" },
      requestMeta,
    });

    const storedHashes = repo.replaceAdminRecoveryCodes.mock.calls[0][1];
    expect(result.data.recoveryCodes).toHaveLength(8);
    expect(storedHashes).toHaveLength(8);
    expect(storedHashes).toEqual(
      result.data.recoveryCodes.map((code) => hashRecoveryCode(code)),
    );
    expect(storedHashes.every((hash) => /^[a-f0-9]{64}$/.test(hash))).toBe(true);
  });
});
