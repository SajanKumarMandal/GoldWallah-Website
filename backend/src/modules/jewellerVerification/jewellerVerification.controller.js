import {
  ADMIN_AUDIT_ACTIONS,
  requestAuditMeta,
} from "../admin/admin.audit.js";
import { withPrivateMediaUrls } from "../media/privateMedia.service.js";
import {
  deleteJewellerVerificationFiles,
  getJewellerVerificationFileUrl,
  getUploadedVerificationFiles,
  uploadJewellerVerificationFiles,
  validateJewellerVerificationFiles,
} from "./jewellerVerification.upload.js";
import {
  adminListQuerySchema,
  approveVerificationSchema,
  rejectVerificationSchema,
  submitJewellerVerificationSchema,
  uuidParamSchema,
  validateBody,
  validateParams,
  validateQuery,
} from "./jewellerVerification.validation.js";
import {
  approveJewellerBusinessVerification,
  getJewellerBusinessVerificationDetail,
  getJewellerBusinessVerifications,
  getMyJewellerBusinessVerification,
  rejectJewellerBusinessVerification,
  submitJewellerBusinessVerification,
} from "./jewellerVerification.service.js";

export { uploadJewellerVerificationFiles };

function signedBusinessVerification(request, verification, actorType, actorId) {
  return withPrivateMediaUrls(request, verification, [
    {
      field: "shopFrontImageUrl",
      scope: "jeweller-verifications",
      actorType,
      actorId,
      subjectType: "JEWELLER_BUSINESS_VERIFICATION",
      subjectId: verification?.id,
      auditAction:
        actorType === "admin"
          ? ADMIN_AUDIT_ACTIONS.jewellerBusinessDocumentViewed
          : null,
    },
    {
      field: "gstCertificateImageUrl",
      scope: "jeweller-verifications",
      actorType,
      actorId,
      subjectType: "JEWELLER_BUSINESS_VERIFICATION",
      subjectId: verification?.id,
      auditAction:
        actorType === "admin"
          ? ADMIN_AUDIT_ACTIONS.jewellerBusinessDocumentViewed
          : null,
    },
    {
      field: "shopLicenseImageUrl",
      scope: "jeweller-verifications",
      actorType,
      actorId,
      subjectType: "JEWELLER_BUSINESS_VERIFICATION",
      subjectId: verification?.id,
      auditAction:
        actorType === "admin"
          ? ADMIN_AUDIT_ACTIONS.jewellerBusinessDocumentViewed
          : null,
    },
  ]);
}

function withSignedBusinessVerification(request, result, actorType, actorId) {
  if (!result?.data?.verification) {
    return result;
  }

  return {
    ...result,
    data: {
      ...result.data,
      verification: signedBusinessVerification(
        request,
        result.data.verification,
        actorType,
        actorId,
      ),
    },
  };
}

function requestMeta(request) {
  return {
    ipAddress: request.ip,
    userAgent: request.get("user-agent") || null,
  };
}

async function cleanupUploadedFiles(request) {
  const files = getUploadedVerificationFiles(request);

  if (files.length === 0) {
    return;
  }

  try {
    await deleteJewellerVerificationFiles(files);
  } catch (error) {
    request.log.warn(
      { error },
      "Failed to clean up uploaded jeweller verification files",
    );
  }
}

function getImageUrls(request) {
  return {
    shopFrontImageUrl: getJewellerVerificationFileUrl(
      request,
      request.files?.shopFrontImage?.[0],
    ),
    gstCertificateImageUrl: getJewellerVerificationFileUrl(
      request,
      request.files?.gstCertificateImage?.[0],
    ),
    shopLicenseImageUrl: getJewellerVerificationFileUrl(
      request,
      request.files?.shopLicenseImage?.[0],
    ),
  };
}

export async function submitVerification(request, response, next) {
  try {
    const payload = validateBody(submitJewellerVerificationSchema, request.body);
    await validateJewellerVerificationFiles(request);

    response.status(201).json(
      withSignedBusinessVerification(
        request,
        await submitJewellerBusinessVerification({
          user: request.user,
          payload,
          imageUrls: getImageUrls(request),
          requestMeta: requestMeta(request),
        }),
        "user",
        request.user.id,
      ),
    );
  } catch (error) {
    await cleanupUploadedFiles(request);
    next(error);
  }
}

export async function myVerification(request, response, next) {
  try {
    response.status(200).json(
      withSignedBusinessVerification(
        request,
        await getMyJewellerBusinessVerification(request.user),
        "user",
        request.user.id,
      ),
    );
  } catch (error) {
    next(error);
  }
}

export async function listVerifications(request, response, next) {
  try {
    const filters = validateQuery(adminListQuerySchema, request.query);
    response.status(200).json(await getJewellerBusinessVerifications(filters));
  } catch (error) {
    next(error);
  }
}

export async function verificationDetail(request, response, next) {
  try {
    const { verificationId } = validateParams(uuidParamSchema, request.params);
    const result = await getJewellerBusinessVerificationDetail({
        verificationId,
        adminUser: request.admin,
        requestMeta: requestAuditMeta(request),
    });

    response.status(200).json({
      ...result,
      data: signedBusinessVerification(
        request,
        result.data,
        "admin",
        request.admin.id,
      ),
    });
  } catch (error) {
    next(error);
  }
}

export async function approveVerification(request, response, next) {
  try {
    const { verificationId } = validateParams(uuidParamSchema, request.params);
    const { reviewNotes } = validateBody(approveVerificationSchema, request.body);

    response.status(200).json(
      withSignedBusinessVerification(
        request,
        await approveJewellerBusinessVerification({
          verificationId,
          adminUser: request.admin,
          reviewNotes,
          requestMeta: requestMeta(request),
        }),
        "admin",
        request.admin.id,
      ),
    );
  } catch (error) {
    next(error);
  }
}

export async function rejectVerification(request, response, next) {
  try {
    const { verificationId } = validateParams(uuidParamSchema, request.params);
    const { rejectionReason, reviewNotes } = validateBody(
      rejectVerificationSchema,
      request.body,
    );

    response.status(200).json(
      withSignedBusinessVerification(
        request,
        await rejectJewellerBusinessVerification({
          verificationId,
          adminUser: request.admin,
          rejectionReason,
          reviewNotes,
          requestMeta: requestMeta(request),
        }),
        "admin",
        request.admin.id,
      ),
    );
  } catch (error) {
    next(error);
  }
}
