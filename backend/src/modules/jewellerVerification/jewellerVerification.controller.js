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
      await submitJewellerBusinessVerification({
        user: request.user,
        payload,
        imageUrls: getImageUrls(request),
        requestMeta: requestMeta(request),
      }),
    );
  } catch (error) {
    await cleanupUploadedFiles(request);
    next(error);
  }
}

export async function myVerification(request, response, next) {
  try {
    response.status(200).json(
      await getMyJewellerBusinessVerification(request.user),
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
    response.status(200).json(
      await getJewellerBusinessVerificationDetail({
        verificationId,
        adminUser: request.user,
        requestMeta: requestMeta(request),
      }),
    );
  } catch (error) {
    next(error);
  }
}

export async function approveVerification(request, response, next) {
  try {
    const { verificationId } = validateParams(uuidParamSchema, request.params);
    const { reviewNotes } = validateBody(approveVerificationSchema, request.body);

    response.status(200).json(
      await approveJewellerBusinessVerification({
        verificationId,
        adminUser: request.user,
        reviewNotes,
        requestMeta: requestMeta(request),
      }),
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
      await rejectJewellerBusinessVerification({
        verificationId,
        adminUser: request.user,
        rejectionReason,
        reviewNotes,
        requestMeta: requestMeta(request),
      }),
    );
  } catch (error) {
    next(error);
  }
}
