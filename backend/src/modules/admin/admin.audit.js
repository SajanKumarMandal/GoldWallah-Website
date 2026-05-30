import { createAdminAuditLog } from "./admin.repository.js";

export const ADMIN_AUDIT_ACTIONS = {
  loginSuccess: "ADMIN_LOGIN_SUCCESS",
  loginFailure: "ADMIN_LOGIN_FAILURE",
  logout: "ADMIN_LOGOUT",
  refreshRotated: "ADMIN_REFRESH_TOKEN_ROTATED",
  refreshInvalid: "ADMIN_REFRESH_TOKEN_INVALID",
  refreshExpired: "ADMIN_REFRESH_TOKEN_EXPIRED",
  refreshReuseDetected: "ADMIN_REFRESH_TOKEN_REUSE_DETECTED",
  refreshBlockedInactiveAdmin: "ADMIN_REFRESH_BLOCKED_INACTIVE_ADMIN",
  passwordChanged: "ADMIN_PASSWORD_CHANGED",
  subAdminCreated: "ADMIN_SUBADMIN_CREATED",
  rolesAssigned: "ADMIN_ROLES_ASSIGNED",
  adminStatusUpdated: "ADMIN_STATUS_UPDATED",
  permissionDenied: "ADMIN_PERMISSION_DENIED",
  seedSuperAdminCreated: "ADMIN_SUPER_ADMIN_SEEDED",
  sellerKycIdentityViewed: "ADMIN_SELLER_KYC_IDENTITY_VIEWED",
  sellerKycSelfieViewed: "ADMIN_SELLER_KYC_SELFIE_VIEWED",
  jewellerBusinessIdentityViewed: "ADMIN_JEWELLER_BUSINESS_IDENTITY_VIEWED",
  jewellerBusinessDocumentViewed: "ADMIN_JEWELLER_BUSINESS_DOCUMENT_VIEWED",
};

export function requestAuditMeta(request) {
  return {
    ipAddress: request?.ip || null,
    userAgent: request?.get?.("user-agent") || null,
    requestId: request?.requestId || request?.id || null,
  };
}

export async function writeAdminAuditLog(
  {
    actorAdminId = null,
    action,
    resourceType,
    resourceId = null,
    oldValue = null,
    newValue = null,
    reason = null,
    severity = "INFO",
    requestMeta = {},
  },
  client,
) {
  return createAdminAuditLog(
    {
      actorAdminId,
      action,
      resourceType,
      resourceId,
      oldValue,
      newValue,
      reason,
      severity,
      ipAddress: requestMeta.ipAddress,
      userAgent: requestMeta.userAgent,
      requestId: requestMeta.requestId,
    },
    client,
  );
}
