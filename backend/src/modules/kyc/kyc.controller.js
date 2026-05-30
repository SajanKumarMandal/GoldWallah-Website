import {
  ADMIN_AUDIT_ACTIONS,
  requestAuditMeta,
} from "../admin/admin.audit.js";
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
  approveSellerKyc,
  getSellerKyc,
  getSellerKycSubmission,
  getSellerKycSubmissions,
  rejectSellerKyc,
  submitSellerKyc,
} from "./kyc.service.js";

export { uploadSellerKycImages };

function signedSellerKycSubmission(request, submission, actorType, actorId) {
  return withPrivateMediaUrls(request, submission, [
    {
      field: "selfieImageUrl",
      scope: "kyc",
      actorType,
      actorId,
      subjectType: "SELLER_KYC",
      subjectId: submission?.id,
      auditAction:
        actorType === "admin"
          ? ADMIN_AUDIT_ACTIONS.sellerKycSelfieViewed
          : null,
    },
  ]);
}

function withSignedSellerKycSubmission(request, result, actorType, actorId) {
  if (!result?.data?.submission) {
    return result;
  }

  return {
    ...result,
    data: {
      ...result.data,
      submission: signedSellerKycSubmission(
        request,
        result.data.submission,
        actorType,
        actorId,
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

export async function submitSeller(request, response, next) {
  try {
    const payload = validateBody(sellerKycSchema, request.body);
    await validateSellerKycImageFiles(request);
    response.status(201).json(
      withSignedSellerKycSubmission(
        request,
        await submitSellerKyc(request.user, {
          ...payload,
          ...getRequiredImageUrls(request),
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

export async function sellerMe(request, response, next) {
  try {
    response.status(200).json(
      withSignedSellerKycSubmission(
        request,
        await getSellerKyc(request.user),
        "user",
        request.user.id,
      ),
    );
  } catch (error) {
    next(error);
  }
}

export async function listSellerSubmissions(request, response, next) {
  try {
    const query = validateQuery(adminKycListQuerySchema, request.query);
    response.status(200).json(await getSellerKycSubmissions(query));
  } catch (error) {
    next(error);
  }
}

export async function sellerSubmissionDetail(request, response, next) {
  try {
    const { kycId } = validateParams(uuidParamSchema, request.params);
    const result = await getSellerKycSubmission(
      kycId,
      request.admin,
      requestAuditMeta(request),
    );

    response.status(200).json({
      ...result,
      data: signedSellerKycSubmission(
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

export async function approveSellerSubmission(request, response, next) {
  try {
    const { kycId } = validateParams(uuidParamSchema, request.params);
    response.status(200).json(
      withSignedSellerKycSubmission(
        request,
        await approveSellerKyc({
          kycId,
          adminUser: request.admin,
        }),
        "admin",
        request.admin.id,
      ),
    );
  } catch (error) {
    next(error);
  }
}

export async function rejectSellerSubmission(request, response, next) {
  try {
    const { kycId } = validateParams(uuidParamSchema, request.params);
    const { rejectionReason } = validateBody(rejectKycSchema, request.body);
    response.status(200).json(
      withSignedSellerKycSubmission(
        request,
        await rejectSellerKyc({
          kycId,
          adminUser: request.admin,
          rejectionReason,
        }),
        "admin",
        request.admin.id,
      ),
    );
  } catch (error) {
    next(error);
  }
}
