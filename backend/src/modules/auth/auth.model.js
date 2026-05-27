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
