import { createHash } from "node:crypto";

import { withTransaction } from "../../config/db.js";
import {
  ADMIN_AUDIT_ACTIONS,
  writeAdminAuditLog,
} from "../admin/admin.audit.js";
import {
  approveJewellerVerification,
  createAuditLog,
  createJewellerVerification,
  findJewellerVerificationById,
  findJewellerVerificationWithEncryptedIdentityById,
  findLatestJewellerVerification,
  findPendingJewellerVerification,
  listJewellerVerifications,
  rejectJewellerVerification,
  updateUserBusinessVerificationStatus,
} from "./jewellerVerification.repository.js";
import {
  decryptSensitiveValue,
  encryptSensitiveValue,
} from "./jewellerVerification.encryption.js";

// Jeweller business verification service. Approval here is required before a
// jeweller can transact, and the approved location powers geo matching.
const ENTITY_TYPE = "JEWELLER_BUSINESS_VERIFICATION";

function createError(message, statusCode, code) {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.code = code;
  return error;
}

function mapConstraintError(error) {
  if (error.code !== "23505") {
    throw error;
  }

  if (
    error.constraint === "unique_pending_jeweller_business_verification_per_user"
  ) {
    throw createError(
      "Your business verification is already under review.",
      409,
      "BUSINESS_VERIFICATION_ALREADY_PENDING",
    );
  }

  if (
    error.constraint === "unique_approved_jeweller_gst_hash" ||
    error.constraint === "unique_approved_jeweller_license_hash"
  ) {
    throw createError(
      "This business identity is already approved for another jeweller.",
      409,
      "BUSINESS_IDENTITY_ALREADY_APPROVED",
    );
  }

  throw error;
}

function assertJeweller(user) {
  if (user.role !== "JEWELLER") {
    throw createError("Jeweller role is required", 403, "JEWELLER_ROLE_REQUIRED");
  }
}

function hashSensitiveValue(value) {
  return createHash("sha256").update(value).digest("hex");
}

function toSensitiveIdentity(value) {
  if (!value) {
    return {
      encrypted: null,
      hash: null,
      last4: null,
    };
  }

  return {
    encrypted: encryptSensitiveValue(value),
    hash: hashSensitiveValue(value),
    last4: value.slice(-4),
  };
}

function toSubmissionPayload({ user, payload, imageUrls }) {
  const gst = toSensitiveIdentity(payload.gstNumber);
  const shopLicense = toSensitiveIdentity(payload.shopLicenseNumber);

  return {
    jewellerId: user.id,
    shopName: payload.shopName,
    ownerName: payload.ownerName,
    businessMobile: payload.businessMobile,
    businessEmail: payload.businessEmail,
    gstNumberEncrypted: gst.encrypted,
    gstNumberHash: gst.hash,
    gstLast4: gst.last4,
    shopLicenseNumberEncrypted: shopLicense.encrypted,
    shopLicenseNumberHash: shopLicense.hash,
    shopLicenseLast4: shopLicense.last4,
    businessAddress: payload.businessAddress,
    city: payload.city,
    state: payload.state,
    pincode: payload.pincode,
    latitude: payload.latitude,
    longitude: payload.longitude,
    shopOpeningTime: payload.shopOpeningTime,
    shopClosingTime: payload.shopClosingTime,
    yearsInBusiness: payload.yearsInBusiness,
    businessType: payload.businessType,
    shopFrontImageUrl: imageUrls.shopFrontImageUrl,
    gstCertificateImageUrl: imageUrls.gstCertificateImageUrl,
    shopLicenseImageUrl: imageUrls.shopLicenseImageUrl,
  };
}

async function writeAudit(
  { actorUserId, action, verificationId, jewellerId, status, adminUserId, requestMeta },
  client,
) {
  await createAuditLog(
    {
      actorUserId,
      action,
      entityType: ENTITY_TYPE,
      entityId: verificationId,
      metadata: {
        verificationId,
        jewellerId,
        status,
        ...(adminUserId ? { adminUserId } : {}),
      },
      ipAddress: requestMeta?.ipAddress,
      userAgent: requestMeta?.userAgent,
    },
    client,
  );
}

export async function submitJewellerBusinessVerification({
  user,
  payload,
  imageUrls,
  requestMeta,
}) {
  assertJeweller(user);

  try {
    return await withTransaction(async (client) => {
      const latest = await findLatestJewellerVerification(user.id, client);

      if (latest?.status === "PENDING") {
        throw createError(
          "Your business verification is already under review.",
          409,
          "BUSINESS_VERIFICATION_ALREADY_PENDING",
        );
      }

      if (latest?.status === "APPROVED") {
        throw createError(
          "Your business verification is already approved.",
          409,
          "BUSINESS_VERIFICATION_ALREADY_APPROVED",
        );
      }

      const pending = await findPendingJewellerVerification(user.id, client);

      if (pending) {
        throw createError(
          "Your business verification is already under review.",
          409,
          "BUSINESS_VERIFICATION_ALREADY_PENDING",
        );
      }

      const verification = await createJewellerVerification(
        toSubmissionPayload({ user, payload, imageUrls }),
        client,
      );

      await updateUserBusinessVerificationStatus(user.id, "PENDING", client);
      await writeAudit(
        {
          actorUserId: user.id,
          action: "JEWELLER_BUSINESS_VERIFICATION_SUBMITTED",
          verificationId: verification.id,
          jewellerId: user.id,
          status: verification.status,
          requestMeta,
        },
        client,
      );

      return {
        success: true,
        message: "Jeweller business verification submitted for review",
        data: {
          businessVerificationStatus: "PENDING",
          verification,
        },
      };
    });
  } catch (error) {
    mapConstraintError(error);
  }
}

export async function getMyJewellerBusinessVerification(user) {
  assertJeweller(user);

  const verification = await findLatestJewellerVerification(user.id);

  return {
    success: true,
    data: {
      businessVerificationStatus: verification?.status || "NOT_SUBMITTED",
      verification,
    },
  };
}

export async function getJewellerBusinessVerifications(filters) {
  return {
    success: true,
    data: await listJewellerVerifications(filters),
  };
}

export async function getJewellerBusinessVerificationDetail({
  verificationId,
  adminUser,
  requestMeta,
}) {
  const verification = await findJewellerVerificationWithEncryptedIdentityById(
    verificationId,
  );

  if (!verification) {
    throw createError(
      "Jeweller business verification not found",
      404,
      "BUSINESS_VERIFICATION_NOT_FOUND",
    );
  }

  await writeAudit({
    actorUserId: adminUser.id,
    action: "JEWELLER_FULL_BUSINESS_IDENTITY_VIEWED",
    verificationId,
    jewellerId: verification.jewellerId,
    status: verification.status,
    adminUserId: adminUser.id,
    requestMeta,
  });
  await writeAdminAuditLog({
    actorAdminId: adminUser.id,
    action: ADMIN_AUDIT_ACTIONS.jewellerBusinessIdentityViewed,
    resourceType: "JEWELLER_BUSINESS_VERIFICATION",
    resourceId: verificationId,
    severity: "WARNING",
    requestMeta,
  });

  return {
    success: true,
    data: {
      ...verification,
      gstNumber: decryptSensitiveValue(verification.gstNumberEncrypted),
      shopLicenseNumber: decryptSensitiveValue(
        verification.shopLicenseNumberEncrypted,
      ),
      gstNumberEncrypted: undefined,
      shopLicenseNumberEncrypted: undefined,
    },
  };
}

export async function approveJewellerBusinessVerification({
  verificationId,
  adminUser,
  reviewNotes,
  requestMeta,
}) {
  try {
    return await withTransaction(async (client) => {
    const existing = await findJewellerVerificationById(verificationId, client);

    if (!existing) {
      throw createError(
        "Jeweller business verification not found",
        404,
        "BUSINESS_VERIFICATION_NOT_FOUND",
      );
    }

    const verification = await approveJewellerVerification(
      { id: verificationId, reviewedBy: adminUser.id, reviewNotes },
      client,
    );

    if (!verification) {
      throw createError(
        "Business verification has already been reviewed.",
        409,
        "BUSINESS_VERIFICATION_ALREADY_REVIEWED",
      );
    }

    await updateUserBusinessVerificationStatus(
      verification.jewellerId,
      "APPROVED",
      client,
    );
    await writeAudit(
      {
        actorUserId: adminUser.id,
        action: "JEWELLER_BUSINESS_VERIFICATION_APPROVED",
        verificationId,
        jewellerId: verification.jewellerId,
        status: verification.status,
        adminUserId: adminUser.id,
        requestMeta,
      },
      client,
    );

      return {
        success: true,
        message: "Jeweller business verification approved",
        data: {
          businessVerificationStatus: "APPROVED",
          verification,
        },
      };
    });
  } catch (error) {
    mapConstraintError(error);
  }
}

export async function rejectJewellerBusinessVerification({
  verificationId,
  adminUser,
  rejectionReason,
  reviewNotes,
  requestMeta,
}) {
  return withTransaction(async (client) => {
    const existing = await findJewellerVerificationById(verificationId, client);

    if (!existing) {
      throw createError(
        "Jeweller business verification not found",
        404,
        "BUSINESS_VERIFICATION_NOT_FOUND",
      );
    }

    const verification = await rejectJewellerVerification(
      {
        id: verificationId,
        reviewedBy: adminUser.id,
        rejectionReason,
        reviewNotes,
      },
      client,
    );

    if (!verification) {
      throw createError(
        "Business verification has already been reviewed.",
        409,
        "BUSINESS_VERIFICATION_ALREADY_REVIEWED",
      );
    }

    await updateUserBusinessVerificationStatus(
      verification.jewellerId,
      "REJECTED",
      client,
    );
    await writeAudit(
      {
        actorUserId: adminUser.id,
        action: "JEWELLER_BUSINESS_VERIFICATION_REJECTED",
        verificationId,
        jewellerId: verification.jewellerId,
        status: verification.status,
        adminUserId: adminUser.id,
        requestMeta,
      },
      client,
    );

    return {
      success: true,
      message: "Jeweller business verification rejected",
      data: {
        businessVerificationStatus: "REJECTED",
        verification,
      },
    };
  });
}
