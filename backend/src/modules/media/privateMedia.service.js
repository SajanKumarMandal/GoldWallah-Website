import path from "node:path";

import jwt from "jsonwebtoken";

import { env } from "../../config/env.js";
import {
  CLOUDINARY_UPLOAD_FOLDERS,
  UPLOAD_ACCESS_MODES,
  resolvePrivateStoredMedia,
} from "../../storage/uploadStorageProvider.js";
import { writeAdminAuditLog } from "../admin/admin.audit.js";
import { jewellerVerificationUploadsDir } from "../jewellerVerification/jewellerVerification.upload.js";
import { kycUploadsDir } from "../kyc/kyc.upload.js";

// Private media resolver. KYC, selfie, GST, and license files are not served by
// static Express middleware; access must pass signed URL and ownership/admin checks.
const PRIVATE_MEDIA_SCOPES = {
  kyc: {
    directory: kycUploadsDir,
    folder: CLOUDINARY_UPLOAD_FOLDERS.kyc,
    accessMode: UPLOAD_ACCESS_MODES.authenticated,
    resourceType: "KYC_DOCUMENT",
  },
  "jeweller-verifications": {
    directory: jewellerVerificationUploadsDir,
    folder: CLOUDINARY_UPLOAD_FOLDERS.jewellerVerifications,
    accessMode: UPLOAD_ACCESS_MODES.authenticated,
    resourceType: "JEWELLER_BUSINESS_DOCUMENT",
  },
};

const privateMediaTtl = "5m";
const privateMediaTtlSeconds = 5 * 60;

function createError(message, statusCode, code) {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.code = code;
  return error;
}

function filenameFromStoredUrl(storedUrl) {
  if (!storedUrl) {
    return "";
  }

  try {
    const parsedUrl = new URL(storedUrl);
    return path.basename(parsedUrl.pathname);
  } catch {
    return path.basename(storedUrl);
  }
}

function signingSecret() {
  if (!env.privateMediaSigningSecret) {
    throw createError(
      "Private media signing is not configured",
      500,
      "PRIVATE_MEDIA_NOT_CONFIGURED",
    );
  }

  return env.privateMediaSigningSecret;
}

function publicBackendOrigin(request) {
  if (env.backendPublicUrl) {
    return env.backendPublicUrl.replace(/\/+$/, "");
  }

  const forwardedProto = request.get("x-forwarded-proto")?.split(",")[0]?.trim();
  const forwardedHost = request.get("x-forwarded-host")?.split(",")[0]?.trim();
  const protocol = forwardedProto || request.protocol;
  const host = forwardedHost || request.get("host");

  return `${protocol}://${host}`;
}

export function buildPrivateMediaUrl(
  request,
  {
    scope,
    storedUrl,
    actorType,
    actorId,
    subjectType,
    subjectId,
    auditAction,
  },
) {
  const filename = filenameFromStoredUrl(storedUrl);

  if (!filename || !PRIVATE_MEDIA_SCOPES[scope]) {
    return "";
  }

  const token = jwt.sign(
    {
      scope,
      filename,
      actorType,
      actorId,
      subjectType,
      subjectId,
      auditAction,
    },
    signingSecret(),
    {
      audience: "private-media",
      expiresIn: privateMediaTtl,
    },
  );

  const apiBasePath = `/api/${env.apiVersion}/media/private/${scope}/${encodeURIComponent(filename)}`;
  return `${publicBackendOrigin(request)}${apiBasePath}?token=${encodeURIComponent(token)}`;
}

export function withPrivateMediaUrls(
  request,
  submission,
  descriptors,
) {
  if (!submission) {
    return submission;
  }

  const signedSubmission = { ...submission };

  for (const descriptor of descriptors) {
    signedSubmission[descriptor.field] = buildPrivateMediaUrl(request, {
      ...descriptor,
      storedUrl: submission[descriptor.field],
    });
  }

  return signedSubmission;
}

export async function resolvePrivateMediaRequest({
  scope,
  filename,
  token,
  requestMeta,
}) {
  const config = PRIVATE_MEDIA_SCOPES[scope];

  if (!config || !filename || !token) {
    throw createError("Private media not found", 404, "PRIVATE_MEDIA_NOT_FOUND");
  }

  let payload;

  try {
    payload = jwt.verify(token, signingSecret(), {
      audience: "private-media",
    });
  } catch {
    throw createError("Private media URL has expired", 401, "PRIVATE_MEDIA_URL_INVALID");
  }

  if (payload.scope !== scope || payload.filename !== filename) {
    throw createError("Private media URL is invalid", 401, "PRIVATE_MEDIA_URL_INVALID");
  }

  if (payload.actorType === "admin" && payload.auditAction) {
    await writeAdminAuditLog({
      actorAdminId: payload.actorId,
      action: payload.auditAction,
      resourceType: config.resourceType,
      resourceId: payload.subjectId || filename,
      newValue: {
        filename,
        scope,
        subjectType: payload.subjectType,
        subjectId: payload.subjectId,
      },
      severity: "WARNING",
      requestMeta,
    });
  }

  return resolvePrivateStoredMedia({
    directory: config.directory,
    filename,
    folder: config.folder,
    accessMode: config.accessMode,
    expiresInSeconds: privateMediaTtlSeconds,
  });
}
