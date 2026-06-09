import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const migrationPath = path.resolve(
  "src/database/migrations/018_auth_account_security.sql",
);
const migrationSql = fs.readFileSync(migrationPath, "utf8");

describe("auth account security migration", () => {
  it("creates hashed token tables and active indexes", () => {
    expect(migrationSql).toContain("CREATE TABLE IF NOT EXISTS password_reset_tokens");
    expect(migrationSql).toContain("CREATE TABLE IF NOT EXISTS email_verification_tokens");
    expect(migrationSql).toContain("token_hash TEXT NOT NULL");
    expect(migrationSql).toContain("consumed_at TIMESTAMPTZ");
    expect(migrationSql).toContain("idx_password_reset_tokens_active");
    expect(migrationSql).toContain("idx_email_verification_tokens_active");
  });

  it("adds phone verification OTP purpose and auth audit logs", () => {
    expect(migrationSql).toContain("'PHONE_VERIFY'");
    expect(migrationSql).toContain("CREATE TABLE IF NOT EXISTS auth_audit_logs");
    expect(migrationSql).toContain("ip_hash TEXT");
  });

  it("creates one-time hashed admin MFA recovery codes", () => {
    expect(migrationSql).toContain("CREATE TABLE IF NOT EXISTS admin_mfa_recovery_codes");
    expect(migrationSql).toContain("code_hash TEXT NOT NULL");
    expect(migrationSql).toContain("UNIQUE (admin_user_id, code_hash)");
    expect(migrationSql).toContain("idx_admin_mfa_recovery_codes_active");
  });
});
