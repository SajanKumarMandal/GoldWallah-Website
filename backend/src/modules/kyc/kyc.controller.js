import {
  getKycFileUrl,
  uploadSellerKycImages,
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

function getRequiredImageUrls(request) {
  if (!request.files?.selfieImage?.[0]) {
    const error = new Error("Selfie image is required");
    error.statusCode = 400;
    error.code = "VALIDATION_ERROR";
    error.details = {
      selfieImage: ["Selfie image is required"],
    };
    throw error;
  }

  return {
    selfieImageUrl: getKycFileUrl(request, request.files.selfieImage[0]),
  };
}

export async function submitSeller(request, response, next) {
  try {
    const payload = validateBody(sellerKycSchema, request.body);
    response.status(201).json(
      await submitSellerKyc(request.user, {
        ...payload,
        ...getRequiredImageUrls(request),
      }),
    );
  } catch (error) {
    next(error);
  }
}

export async function sellerMe(request, response, next) {
  try {
    response.status(200).json(await getSellerKyc(request.user));
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
    response.status(200).json(
      await getSellerKycSubmission(kycId, request.user),
    );
  } catch (error) {
    next(error);
  }
}

export async function approveSellerSubmission(request, response, next) {
  try {
    const { kycId } = validateParams(uuidParamSchema, request.params);
    response.status(200).json(
      await approveSellerKyc({
        kycId,
        adminUser: request.user,
      }),
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
      await rejectSellerKyc({
        kycId,
        adminUser: request.user,
        rejectionReason,
      }),
    );
  } catch (error) {
    next(error);
  }
}
