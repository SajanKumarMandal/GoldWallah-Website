import { createHash } from "node:crypto";

import bcrypt from "bcryptjs";
import { beforeEach, describe, expect, it, vi } from "vitest";

const repo = vi.hoisted(() => ({
  clearLoginAttempt: vi.fn(),
  consumeEmailVerificationToken: vi.fn(),
  consumePasswordResetToken: vi.fn(),
  createAuthAuditLog: vi.fn(),
  createEmailVerificationToken: vi.fn(),
  createOtp: vi.fn(),
  createPasswordResetToken: vi.fn(),
  createUser: vi.fn(),
  findEmailVerificationTokenByHash: vi.fn(),
  findLatestActiveOtp: vi.fn(),
  findLoginAttempt: vi.fn(),
  findOAuthAccount: vi.fn(),
  findPasswordResetTokenByHash: vi.fn(),
  findRefreshTokenByHash: vi.fn(),
  findUserByEmail: vi.fn(),
  findUserById: vi.fn(),
  findUserByPhone: vi.fn(),
  incrementOtpAttempts: vi.fn(),
  linkOAuthAccount: vi.fn(),
  markUserEmailVerified: vi.fn(),
  recordLoginFailure: vi.fn(),
  consumeOtp: vi.fn(),
  revokeAllActiveRefreshTokens: vi.fn(),
  revokeAllActiveRefreshTokensExcept: vi.fn(),
  revokeRefreshToken: vi.fn(),
  saveRefreshToken: vi.fn(),
  sanitizeUser: vi.fn((user) => {
    if (!user) return null;
    const safeUser = { ...user };
    delete safeUser.passwordHash;
    return safeUser;
  }),
  updateUserPasswordHash: vi.fn(),
  updateUserPhoneVerified: vi.fn(),
}));

const emailProvider = vi.hoisted(() => ({
  sendPasswordResetEmail: vi.fn(),
  sendEmailVerificationEmail: vi.fn(),
}));
const googleProvider = vi.hoisted(() => ({
  verifyGoogleIdToken: vi.fn(),
}));

vi.mock("../src/config/env.js", () => ({
  env: {
    nodeEnv: "test",
    isProduction: false,
    frontendUrl: "http://localhost:5173",
    jwtAccessSecret: "access-secret-32-characters-long",
    jwtRefreshSecret: "refresh-secret-32-characters-long",
    jwtAccessExpiresIn: "15m",
    jwtRefreshExpiresIn: "7d",
    bcryptSaltRounds: 4,
    passwordResetExpiryMinutes: 15,
    emailVerificationExpiryHours: 24,
    authLoginMaxFailedAttempts: 5,
    authLoginLockMinutes: 15,
    kycIdentityHashSecret: "identity-secret-32-characters-long",
    otpProvider: "mock",
    otpExpiryMinutes: 5,
    otpResendCooldownSeconds: 60,
  },
}));

vi.mock("../src/config/db.js", () => ({
  withTransaction: async (callback) => callback({ query: vi.fn() }),
}));

vi.mock("../src/modules/auth/auth.repository.js", () => repo);
vi.mock("../src/modules/auth/providers/email.provider.js", () => emailProvider);
vi.mock("../src/modules/auth/providers/googleAuth.provider.js", () => googleProvider);
vi.mock("../src/modules/auth/providers/facebookAuth.provider.js", () => ({
  verifyFacebookAccessToken: vi.fn(),
}));
vi.mock("../src/modules/auth/providers/otp.provider.js", () => ({
  generateOtp: vi.fn(() => "123456"),
  sendOtp: vi.fn(async () => ({ configured: true, message: "OTP sent" })),
  usesProviderManagedOtpVerification: vi.fn(() => false),
  verifyOtpWithProvider: vi.fn(),
}));

const authService = await import("../src/modules/auth/auth.service.js");

function hashToken(token) {
  return createHash("sha256").update(token).digest("hex");
}

function activeUser(passwordHash) {
  return {
    id: "user-1",
    fullName: "Sajan Kumar",
    email: "sajan@example.com",
    phone: "9876543210",
    role: "SELLER",
    passwordHash,
    accountStatus: "ACTIVE",
  };
}

describe("password recovery", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns a generic response for unknown email", async () => {
    repo.findUserByEmail.mockResolvedValue(null);

    const result = await authService.requestPasswordReset({
      email: "missing@example.com",
    });

    expect(result.success).toBe(true);
    expect(result.message).toMatch(/If an account exists/);
    expect(repo.createPasswordResetToken).not.toHaveBeenCalled();
    expect(emailProvider.sendPasswordResetEmail).not.toHaveBeenCalled();
  });

  it("stores only a token hash for known email reset requests", async () => {
    repo.findUserByEmail.mockResolvedValue(activeUser("hash"));

    const result = await authService.requestPasswordReset({
      email: "sajan@example.com",
    });

    expect(result.success).toBe(true);
    expect(repo.createPasswordResetToken).toHaveBeenCalledOnce();
    const tokenRecord = repo.createPasswordResetToken.mock.calls[0][0];
    expect(tokenRecord.userId).toBe("user-1");
    expect(tokenRecord.tokenHash).toMatch(/^[a-f0-9]{64}$/);
    expect(emailProvider.sendPasswordResetEmail).toHaveBeenCalledOnce();
    expect(emailProvider.sendPasswordResetEmail.mock.calls[0][0].resetUrl).toContain(
      "/reset-password?token=",
    );
    expect(emailProvider.sendPasswordResetEmail.mock.calls[0][0].resetUrl).not.toContain(
      tokenRecord.tokenHash,
    );
  });

  it("resets a valid token and revokes active refresh tokens", async () => {
    const oldHash = await bcrypt.hash("OldPassword123", 4);
    repo.findPasswordResetTokenByHash.mockResolvedValue({
      id: "token-1",
      userId: "user-1",
      tokenHash: hashToken("valid-reset-token"),
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
      consumedAt: null,
    });
    repo.findUserById.mockResolvedValue(activeUser(oldHash));
    repo.updateUserPasswordHash.mockResolvedValue(activeUser("new-hash"));

    const result = await authService.resetPassword({
      token: "valid-reset-token",
      newPassword: "NewPassword123",
    });

    expect(result.success).toBe(true);
    expect(repo.updateUserPasswordHash).toHaveBeenCalledOnce();
    expect(repo.consumePasswordResetToken).toHaveBeenCalledWith("token-1", expect.anything());
    expect(repo.revokeAllActiveRefreshTokens).toHaveBeenCalledWith(
      "user-1",
      expect.anything(),
    );
  });

  it("rejects expired reset tokens generically", async () => {
    repo.findPasswordResetTokenByHash.mockResolvedValue({
      id: "token-1",
      userId: "user-1",
      expiresAt: new Date(Date.now() - 60_000).toISOString(),
      consumedAt: null,
    });

    await expect(
      authService.resetPassword({
        token: "expired-reset-token",
        newPassword: "NewPassword123",
      }),
    ).rejects.toMatchObject({ code: "INVALID_PASSWORD_RESET_TOKEN" });
    expect(repo.updateUserPasswordHash).not.toHaveBeenCalled();
  });

  it("rejects reused reset tokens generically", async () => {
    repo.findPasswordResetTokenByHash.mockResolvedValue({
      id: "token-1",
      userId: "user-1",
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
      consumedAt: new Date().toISOString(),
    });

    await expect(
      authService.resetPassword({
        token: "reused-reset-token",
        newPassword: "NewPassword123",
      }),
    ).rejects.toMatchObject({ code: "INVALID_PASSWORD_RESET_TOKEN" });
    expect(repo.updateUserPasswordHash).not.toHaveBeenCalled();
  });
});

describe("change password", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects wrong current password", async () => {
    repo.findUserById.mockResolvedValue(activeUser(await bcrypt.hash("Correct12345", 4)));

    await expect(
      authService.changePassword({
        user: { id: "user-1" },
        currentPassword: "Wrong12345",
        newPassword: "NewPassword123",
      }),
    ).rejects.toMatchObject({ code: "INVALID_PASSWORD" });
  });

  it("blocks reusing the current password", async () => {
    repo.findUserById.mockResolvedValue(activeUser(await bcrypt.hash("SamePassword123", 4)));

    await expect(
      authService.changePassword({
        user: { id: "user-1" },
        currentPassword: "SamePassword123",
        newPassword: "SamePassword123",
      }),
    ).rejects.toMatchObject({ code: "PASSWORD_REUSED" });
  });

  it("changes password and revokes other refresh sessions", async () => {
    repo.findUserById.mockResolvedValue(activeUser(await bcrypt.hash("OldPassword123", 4)));
    repo.updateUserPasswordHash.mockResolvedValue(activeUser("new-hash"));

    const result = await authService.changePassword({
      user: { id: "user-1" },
      currentPassword: "OldPassword123",
      newPassword: "NewPassword123",
      currentRefreshToken: "current-refresh-token",
    });

    expect(result.success).toBe(true);
    expect(repo.updateUserPasswordHash).toHaveBeenCalledOnce();
    expect(repo.revokeAllActiveRefreshTokensExcept).toHaveBeenCalledWith(
      "user-1",
      hashToken("current-refresh-token"),
      expect.anything(),
    );
  });
});

describe("oauth account linking", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    googleProvider.verifyGoogleIdToken.mockResolvedValue({
      provider: "GOOGLE",
      providerSubject: "google-subject-1",
      email: "sajan@example.com",
      fullName: "Sajan Kumar",
      isEmailVerified: true,
    });
  });

  it("blocks social registration when email already exists", async () => {
    repo.findOAuthAccount.mockResolvedValue(null);
    repo.findUserByEmail.mockResolvedValue(activeUser("hash"));

    await expect(
      authService.registerWithGoogle({
        idToken: "google-id-token",
        role: "SELLER",
      }),
    ).rejects.toMatchObject({ code: "ACCOUNT_EXISTS" });
  });

  it("blocks provider subject role conflicts", async () => {
    repo.findOAuthAccount.mockResolvedValue({
      ...activeUser(null),
      role: "SELLER",
    });

    await expect(
      authService.registerWithGoogle({
        idToken: "google-id-token",
        role: "JEWELLER",
      }),
    ).rejects.toMatchObject({ code: "OAUTH_ROLE_CONFLICT" });
  });
});
