import { withTransaction } from "../../config/db.js";
import { hashIdentityValue } from "../../utils/identityHash.js";
import {
  ADMIN_AUDIT_ACTIONS,
  writeAdminAuditLog,
} from "../admin/admin.audit.js";
import { notifyUser } from "../notifications/notifications.service.js";
import {
  approveKycSubmission,
  createKycSubmission,
  findKycSubmissionById,
  findKycSubmissionWithEncryptedIdentityById,
  findLatestKycForUser,
  findPendingKycForUser,
  listKycSubmissions,
  rejectKycSubmission,
  updateUserKycStatus,
} from "./kyc.repository.js";
import {
  decryptSensitiveValue,
  encryptSensitiveValue,
} from "./kyc.encryption.js";

// Role-aware user KYC service. Sensitive identity numbers are encrypted,
// hashes support duplicate checks, and full identity admin views are audited.
const KYC_ROLE_CONFIG = {
  SELLER: {
    label: "Seller",
    resourceType: "SELLER_KYC",
    identityViewedAction: ADMIN_AUDIT_ACTIONS.sellerKycIdentityViewed,
    approvedAction: ADMIN_AUDIT_ACTIONS.sellerKycApproved,
    rejectedAction: ADMIN_AUDIT_ACTIONS.sellerKycRejected,
    approvedTitle: "Seller KYC approved",
    approvedBody:
      "Your identity verification is approved. You can now create gold listings.",
    rejectedTitle: "Seller KYC needs correction",
    rejectedBody:
      "Your identity verification was rejected. Review the reason and submit KYC again.",
    submittedMessage: "Seller KYC submitted for review",
    approvedMessage: "Seller KYC approved",
    rejectedMessage: "Seller KYC rejected",
  },
  JEWELLER: {
    label: "Jeweller",
    resourceType: "JEWELLER_KYC",
    identityViewedAction: ADMIN_AUDIT_ACTIONS.jewellerKycIdentityViewed,
    approvedAction: ADMIN_AUDIT_ACTIONS.jewellerKycApproved,
    rejectedAction: ADMIN_AUDIT_ACTIONS.jewellerKycRejected,
    approvedTitle: "Jeweller KYC approved",
    approvedBody:
      "Your identity verification is approved. Complete business verification to unlock bidding.",
    rejectedTitle: "Jeweller KYC needs correction",
    rejectedBody:
      "Your identity verification was rejected. Review the reason and submit KYC again.",
    submittedMessage: "Jeweller KYC submitted for review",
    approvedMessage: "Jeweller KYC approved",
    rejectedMessage: "Jeweller KYC rejected",
  },
};

function createError(message, statusCode, code) {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.code = code;
  return error;
}

function mapKycConstraintError(error) {
  if (error.code !== "23505") {
    throw error;
  }

  if (
    error.constraint === "unique_pending_kyc_per_user" ||
    error.constraint === "idx_kyc_submissions_one_pending_per_user"
  ) {
    throw createError(
      "Your KYC is already under review.",
      409,
      "KYC_ALREADY_PENDING",
    );
  }

  if (
    error.constraint === "unique_approved_kyc_aadhaar_hash" ||
    error.constraint === "unique_approved_kyc_pan_hash"
  ) {
    throw createError(
      "This identity is already approved for another account.",
      409,
      "KYC_IDENTITY_ALREADY_APPROVED",
    );
  }

  throw error;
}

function roleConfig(role) {
  const config = KYC_ROLE_CONFIG[role];

  if (!config) {
    throw createError("Unsupported KYC role", 400, "UNSUPPORTED_KYC_ROLE");
  }

  return config;
}

function assertUserRole(user, role) {
  if (user?.role !== role) {
    throw createError("Forbidden", 403, "FORBIDDEN");
  }
}

function validateSelfieFreshness(selfieCapturedAt) {
  const capturedAt = new Date(selfieCapturedAt);
  const capturedAtMs = capturedAt.getTime();

  if (Number.isNaN(capturedAtMs)) {
    throw createError(
      "Selfie captured time must be a valid ISO datetime",
      400,
      "INVALID_SELFIE_CAPTURED_AT",
    );
  }

  const nowMs = Date.now();
  const maxAgeMs = 5 * 60 * 1000;
  const maxFutureSkewMs = 60 * 1000;

  if (nowMs - capturedAtMs > maxAgeMs) {
    throw createError(
      "Selfie must be captured within 5 minutes of submission.",
      400,
      "STALE_SELFIE",
    );
  }

  if (capturedAtMs - nowMs > maxFutureSkewMs) {
    throw createError(
      "Selfie captured time cannot be in the future.",
      400,
      "FUTURE_SELFIE_CAPTURED_AT",
    );
  }

  return capturedAt;
}

function toSubmissionPayload(userId, payload) {
  return {
    userId,
    fullName: payload.fullName,
    mobileNumber: payload.mobileNumber,
    addressAsPerAadhaar: payload.addressAsPerAadhaar,
    aadhaarNumberHash: hashIdentityValue(payload.aadhaarNumber),
    aadhaarNumberEncrypted: encryptSensitiveValue(payload.aadhaarNumber),
    panNumberHash: hashIdentityValue(payload.panNumber),
    panNumberEncrypted: encryptSensitiveValue(payload.panNumber),
    aadhaarLast4: payload.aadhaarNumber.slice(-4),
    panLast4: payload.panNumber.slice(-4),
    selfieImageUrl: payload.selfieImageUrl,
    selfieCapturedAt: validateSelfieFreshness(payload.selfieCapturedAt),
  };
}

async function recordFullIdentityView({ adminUserId, kycId, requestMeta }) {
  const config = roleConfig(requestMeta.role);

  await writeAdminAuditLog({
    actorAdminId: adminUserId,
    action: config.identityViewedAction,
    resourceType: config.resourceType,
    resourceId: kycId,
    severity: "WARNING",
    requestMeta,
  });
}

export async function submitKycForRole(user, payload, role) {
  assertUserRole(user, role);
  const config = roleConfig(role);

  try {
    return await withTransaction(async (client) => {
    const latestSubmission = await findLatestKycForUser(user.id, client, {
      role,
    });

    if (latestSubmission?.status === "PENDING") {
      throw createError(
        "Your KYC is already under review.",
        409,
        "KYC_ALREADY_PENDING",
      );
    }

    if (latestSubmission?.status === "APPROVED") {
      throw createError(
        "Your KYC is already approved.",
        409,
        "KYC_ALREADY_APPROVED",
      );
    }

    const data = toSubmissionPayload(user.id, payload);
    const pendingSubmission = await findPendingKycForUser(user.id, client, {
      role,
    });

    if (pendingSubmission) {
      throw createError(
        "Your KYC is already under review.",
        409,
        "KYC_ALREADY_PENDING",
      );
    }

    const submission = await createKycSubmission(data, client);

    await updateUserKycStatus(user.id, "PENDING", client);

    return {
      success: true,
      message: config.submittedMessage,
      data: {
        kycStatus: "PENDING",
        submission,
      },
    };
    });
  } catch (error) {
    mapKycConstraintError(error);
  }
}

export async function getKycForRole(user, role) {
  assertUserRole(user, role);
  const submission = await findLatestKycForUser(user.id, undefined, { role });

  return {
    success: true,
    data: {
      kycStatus: submission?.status || "NOT_SUBMITTED",
      submission,
    },
  };
}

export async function getKycSubmissionsForRole(role, filters) {
  roleConfig(role);

  return {
    success: true,
    data: await listKycSubmissions({ ...filters, role }),
  };
}

export async function getKycSubmissionForRole(
  role,
  kycId,
  adminUser,
  requestMeta,
) {
  const submission = await findKycSubmissionWithEncryptedIdentityById(
    kycId,
    undefined,
    { role },
  );

  if (!submission) {
    throw createError("KYC submission not found", 404, "KYC_NOT_FOUND");
  }

  await recordFullIdentityView({
    adminUserId: adminUser.id,
    kycId,
    requestMeta: { ...requestMeta, role },
  });

  return {
    success: true,
    data: {
      id: submission.id,
      userId: submission.userId,
      fullName: submission.fullName,
      mobileNumber: submission.mobileNumber,
      addressAsPerAadhaar: submission.addressAsPerAadhaar,
      aadhaarNumber: decryptSensitiveValue(submission.aadhaarNumberEncrypted),
      panNumber: decryptSensitiveValue(submission.panNumberEncrypted),
      aadhaarLast4: submission.aadhaarLast4,
      panLast4: submission.panLast4,
      selfieImageUrl: submission.selfieImageUrl,
      selfieCapturedAt: submission.selfieCapturedAt,
      status: submission.status,
      rejectionReason: submission.rejectionReason,
      reviewedAt: submission.reviewedAt,
      createdAt: submission.createdAt,
      updatedAt: submission.updatedAt,
    },
  };
}

export async function approveKycForRole({ role, kycId, adminUser, requestMeta }) {
  const config = roleConfig(role);

  try {
    return await withTransaction(async (client) => {
    const existingSubmission = await findKycSubmissionById(kycId, client, {
      role,
    });

    if (!existingSubmission) {
      throw createError("KYC submission not found", 404, "KYC_NOT_FOUND");
    }

    const submission = await approveKycSubmission(
      { id: kycId, reviewedBy: adminUser.id, role },
      client,
    );

    if (!submission) {
      throw createError(
        "Only pending KYC submissions can be approved",
        409,
        "KYC_NOT_PENDING",
      );
    }

    await updateUserKycStatus(submission.userId, "APPROVED", client);
    await notifyUser(
      {
        userId: submission.userId,
        type: "KYC_APPROVED",
        title: config.approvedTitle,
        body: config.approvedBody,
        entityType: config.resourceType,
        entityId: submission.id,
      },
      client,
    );
    await writeAdminAuditLog(
      {
        actorAdminId: adminUser.id,
        action: config.approvedAction,
        resourceType: config.resourceType,
        resourceId: submission.id,
        oldValue: { status: existingSubmission.status },
        newValue: { status: submission.status, userId: submission.userId },
        requestMeta,
      },
      client,
    );

    return {
      success: true,
      message: config.approvedMessage,
      data: {
        kycStatus: "APPROVED",
        submission,
      },
    };
    });
  } catch (error) {
    mapKycConstraintError(error);
  }
}

export async function rejectKycForRole({
  role,
  kycId,
  adminUser,
  rejectionReason,
  requestMeta,
}) {
  const config = roleConfig(role);

  return withTransaction(async (client) => {
    const existingSubmission = await findKycSubmissionById(kycId, client, {
      role,
    });

    if (!existingSubmission) {
      throw createError("KYC submission not found", 404, "KYC_NOT_FOUND");
    }

    const submission = await rejectKycSubmission(
      {
        id: kycId,
        reviewedBy: adminUser.id,
        rejectionReason,
        role,
      },
      client,
    );

    if (!submission) {
      throw createError(
        "Only pending KYC submissions can be rejected",
        409,
        "KYC_NOT_PENDING",
      );
    }

    await updateUserKycStatus(submission.userId, "REJECTED", client);
    await notifyUser(
      {
        userId: submission.userId,
        type: "KYC_REJECTED",
        title: config.rejectedTitle,
        body: config.rejectedBody,
        entityType: config.resourceType,
        entityId: submission.id,
      },
      client,
    );
    await writeAdminAuditLog(
      {
        actorAdminId: adminUser.id,
        action: config.rejectedAction,
        resourceType: config.resourceType,
        resourceId: submission.id,
        oldValue: { status: existingSubmission.status },
        newValue: {
          status: submission.status,
          userId: submission.userId,
          rejectionReason,
        },
        reason: rejectionReason,
        severity: "WARNING",
        requestMeta,
      },
      client,
    );

    return {
      success: true,
      message: config.rejectedMessage,
      data: {
        kycStatus: "REJECTED",
        submission,
      },
    };
  });
}

export function kycSelfieViewedActionForRole(role) {
  if (role === "JEWELLER") {
    return ADMIN_AUDIT_ACTIONS.jewellerKycSelfieViewed;
  }

  return ADMIN_AUDIT_ACTIONS.sellerKycSelfieViewed;
}

export function kycResourceTypeForRole(role) {
  return roleConfig(role).resourceType;
}

export const submitSellerKyc = (user, payload) =>
  submitKycForRole(user, payload, "SELLER");
export const getSellerKyc = (user) => getKycForRole(user, "SELLER");
export const getSellerKycSubmissions = (filters) =>
  getKycSubmissionsForRole("SELLER", filters);
export const getSellerKycSubmission = (kycId, adminUser, requestMeta) =>
  getKycSubmissionForRole("SELLER", kycId, adminUser, requestMeta);
export const approveSellerKyc = ({ kycId, adminUser, requestMeta }) =>
  approveKycForRole({ role: "SELLER", kycId, adminUser, requestMeta });
export const rejectSellerKyc = ({
  kycId,
  adminUser,
  rejectionReason,
  requestMeta,
}) =>
  rejectKycForRole({
    role: "SELLER",
    kycId,
    adminUser,
    rejectionReason,
    requestMeta,
  });
