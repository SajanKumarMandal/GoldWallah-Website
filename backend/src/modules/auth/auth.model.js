// Canonical user fields used by older auth-model consumers and documentation.
export const USER_TABLE_FIELDS = [
  "id",
  "fullName",
  "email",
  "phone",
  "passwordHash",
  "role",
  "authProvider",
  "isEmailVerified",
  "isPhoneVerified",
  "kycStatus",
  "businessVerificationStatus",
  "createdAt",
  "updatedAt",
];

// Canonical OTP fields used by older auth-model consumers and documentation.
export const OTP_TABLE_FIELDS = [
  "id",
  "phone",
  "otpHash",
  "purpose",
  "expiresAt",
  "consumedAt",
  "attempts",
  "createdAt",
];
