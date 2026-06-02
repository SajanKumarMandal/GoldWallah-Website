import { requestAuditMeta } from "../admin/admin.audit.js";
import { withPrivateMediaUrls } from "../media/privateMedia.service.js";
import {
  deleteKycFiles,
  getKycFileUrl,
  getUploadedSellerKycFiles,
  uploadSellerKycImages,
  validateSellerKycImageFiles,
} from "./kyc.upload.js";
import {
  adminKycListQuerySchema,
  rejectKycSchema,
  sellerKycSchema,
  uuidParamSchema,
  validateBody,
  validateParams,
  validateQuery,
} from "./kyc.validation.js";
import {
  approveKycForRole,
  getKycForRole,
  getKycSubmissionForRole,
  getKycSubmissionsForRole,
  kycResourceTypeForRole,
  kycSelfieViewedActionForRole,
  rejectKycForRole,
  submitKycForRole,
} from "./kyc.service.js";

export { uploadSellerKycImages };

function signedKycSubmission(request, submission, actorType, actorId, role) {
  return withPrivateMediaUrls(request, submission, [
    {
      field: "selfieImageUrl",
      scope: "kyc",
      actorType,
      actorId,
      subjectType: kycResourceTypeForRole(role),
      subjectId: submission?.id,
      auditAction:
        actorType === "admin"
          ? kycSelfieViewedActionForRole(role)
          : null,
    },
  ]);
}

function withSignedKycSubmission(request, result, actorType, actorId, role) {
  if (!result?.data?.submission) {
    return result;
  }

  return {
    ...result,
    data: {
      ...result.data,
      submission: signedKycSubmission(
        request,
        result.data.submission,
        actorType,
        actorId,
        role,
      ),
    },
  };
}

function getRequiredImageUrls(request) {
  return {
    selfieImageUrl: getKycFileUrl(request, request.files.selfieImage[0]),
  };
}

async function cleanupUploadedFiles(request) {
  const files = getUploadedSellerKycFiles(request);

  if (files.length === 0) {
    return;
  }

  try {
    await deleteKycFiles(files);
  } catch (error) {
    request.log.warn({ error }, "Failed to clean up uploaded KYC files");
  }
}

async function submitForRole(request, response, next, role) {
  try {
    const payload = validateBody(sellerKycSchema, request.body);
    await validateSellerKycImageFiles(request);
    response.status(201).json(
      withSignedKycSubmission(
        request,
        await submitKycForRole(request.user, {
          ...payload,
          ...getRequiredImageUrls(request),
        }, role),
        "user",
        request.user.id,
        role,
      ),
    );
  } catch (error) {
    await cleanupUploadedFiles(request);
    next(error);
  }
}

async function meForRole(request, response, next, role) {
  try {
    response.status(200).json(
      withSignedKycSubmission(
        request,
        await getKycForRole(request.user, role),
        "user",
        request.user.id,
        role,
      ),
    );
  } catch (error) {
    next(error);
  }
}

async function listSubmissionsForRole(request, response, next, role) {
  try {
    const query = validateQuery(adminKycListQuerySchema, request.query);
    response.status(200).json(await getKycSubmissionsForRole(role, query));
  } catch (error) {
    next(error);
  }
}

async function submissionDetailForRole(request, response, next, role) {
  try {
    const { kycId } = validateParams(uuidParamSchema, request.params);
    const result = await getKycSubmissionForRole(
      role,
      kycId,
      request.admin,
      requestAuditMeta(request),
    );

    response.status(200).json({
      ...result,
      data: signedKycSubmission(
        request,
        result.data,
        "admin",
        request.admin.id,
        role,
      ),
    });
  } catch (error) {
    next(error);
  }
}

async function approveSubmissionForRole(request, response, next, role) {
  try {
    const { kycId } = validateParams(uuidParamSchema, request.params);
    response.status(200).json(
      withSignedKycSubmission(
        request,
        await approveKycForRole({
          role,
          kycId,
          adminUser: request.admin,
          requestMeta: requestAuditMeta(request),
        }),
        "admin",
        request.admin.id,
        role,
      ),
    );
  } catch (error) {
    next(error);
  }
}

async function rejectSubmissionForRole(request, response, next, role) {
  try {
    const { kycId } = validateParams(uuidParamSchema, request.params);
    const { rejectionReason } = validateBody(rejectKycSchema, request.body);
    response.status(200).json(
      withSignedKycSubmission(
        request,
        await rejectKycForRole({
          role,
          kycId,
          adminUser: request.admin,
          rejectionReason,
          requestMeta: requestAuditMeta(request),
        }),
        "admin",
        request.admin.id,
        role,
      ),
    );
  } catch (error) {
    next(error);
  }
}

export function submitSeller(request, response, next) {
  return submitForRole(request, response, next, "SELLER");
}

export function submitJeweller(request, response, next) {
  return submitForRole(request, response, next, "JEWELLER");
}

export function sellerMe(request, response, next) {
  return meForRole(request, response, next, "SELLER");
}

export function jewellerMe(request, response, next) {
  return meForRole(request, response, next, "JEWELLER");
}

export function listSellerSubmissions(request, response, next) {
  return listSubmissionsForRole(request, response, next, "SELLER");
}

export function listJewellerSubmissions(request, response, next) {
  return listSubmissionsForRole(request, response, next, "JEWELLER");
}

export function sellerSubmissionDetail(request, response, next) {
  return submissionDetailForRole(request, response, next, "SELLER");
}

export function jewellerSubmissionDetail(request, response, next) {
  return submissionDetailForRole(request, response, next, "JEWELLER");
}

export function approveSellerSubmission(request, response, next) {
  return approveSubmissionForRole(request, response, next, "SELLER");
}

export function approveJewellerSubmission(request, response, next) {
  return approveSubmissionForRole(request, response, next, "JEWELLER");
}

export function rejectSellerSubmission(request, response, next) {
  return rejectSubmissionForRole(request, response, next, "SELLER");
}

export function rejectJewellerSubmission(request, response, next) {
  return rejectSubmissionForRole(request, response, next, "JEWELLER");
}
