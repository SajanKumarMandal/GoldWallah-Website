import { createHash } from "node:crypto";

import { withTransaction } from "../../config/db.js";
import {
  approveKycSubmission,
  createSellerKycSubmission,
  findKycSubmissionById,
  findKycSubmissionWithEncryptedIdentityById,
  findLatestSellerKyc,
  findPendingSellerKyc,
  listSellerKycSubmissions,
  rejectKycSubmission,
  updateUserKycStatus,
} from "./kyc.repository.js";
import {
  decryptSensitiveValue,
  encryptSensitiveValue,
} from "./kyc.encryption.js";

function createError(message, statusCode, code) {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.code = code;
  return error;
}

function hashSensitiveValue(value) {
  return createHash("sha256").update(value).digest("hex");
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
    aadhaarNumberHash: hashSensitiveValue(payload.aadhaarNumber),
    aadhaarNumberEncrypted: encryptSensitiveValue(payload.aadhaarNumber),
    panNumberHash: hashSensitiveValue(payload.panNumber),
    panNumberEncrypted: encryptSensitiveValue(payload.panNumber),
    aadhaarLast4: payload.aadhaarNumber.slice(-4),
    panLast4: payload.panNumber.slice(-4),
    selfieImageUrl: payload.selfieImageUrl,
    selfieCapturedAt: validateSelfieFreshness(payload.selfieCapturedAt),
  };
}

async function recordFullIdentityView({ adminUserId, kycId }) {
  // TODO: Replace this placeholder with persistent audit logging when the audit
  // module has a repository/table. Event: KYC_FULL_IDENTITY_VIEWED with
  // adminUserId, kycId, and timestamp.
  void adminUserId;
  void kycId;
}

export async function submitSellerKyc(user, payload) {
  return withTransaction(async (client) => {
    const latestSubmission = await findLatestSellerKyc(user.id, client);

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
    const pendingSubmission = await findPendingSellerKyc(user.id, client);

    if (pendingSubmission) {
      throw createError(
        "Your KYC is already under review.",
        409,
        "KYC_ALREADY_PENDING",
      );
    }

    const submission = await createSellerKycSubmission(data, client);

    await updateUserKycStatus(user.id, "PENDING", client);

    return {
      success: true,
      message: "Seller KYC submitted for review",
      data: {
        kycStatus: "PENDING",
        submission,
      },
    };
  });
}

export async function getSellerKyc(user) {
  const submission = await findLatestSellerKyc(user.id);

  return {
    success: true,
    data: {
      kycStatus: submission?.status || "NOT_SUBMITTED",
      submission,
    },
  };
}

export async function getSellerKycSubmissions(filters) {
  return {
    success: true,
    data: await listSellerKycSubmissions(filters),
  };
}

export async function getSellerKycSubmission(kycId, adminUser) {
  const submission = await findKycSubmissionWithEncryptedIdentityById(kycId);

  if (!submission) {
    throw createError("KYC submission not found", 404, "KYC_NOT_FOUND");
  }

  await recordFullIdentityView({
    adminUserId: adminUser.id,
    kycId,
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

export async function approveSellerKyc({ kycId, adminUser }) {
  return withTransaction(async (client) => {
    const existingSubmission = await findKycSubmissionById(kycId, client);

    if (!existingSubmission) {
      throw createError("KYC submission not found", 404, "KYC_NOT_FOUND");
    }

    const submission = await approveKycSubmission(
      { id: kycId, reviewedBy: adminUser.id },
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

    return {
      success: true,
      message: "Seller KYC approved",
      data: {
        kycStatus: "APPROVED",
        submission,
      },
    };
  });
}

export async function rejectSellerKyc({ kycId, adminUser, rejectionReason }) {
  return withTransaction(async (client) => {
    const existingSubmission = await findKycSubmissionById(kycId, client);

    if (!existingSubmission) {
      throw createError("KYC submission not found", 404, "KYC_NOT_FOUND");
    }

    const submission = await rejectKycSubmission(
      {
        id: kycId,
        reviewedBy: adminUser.id,
        rejectionReason,
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

    return {
      success: true,
      message: "Seller KYC rejected",
      data: {
        kycStatus: "REJECTED",
        submission,
      },
    };
  });
}
