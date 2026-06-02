import path from "node:path";
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";

import multer from "multer";

import {
  CLOUDINARY_UPLOAD_FOLDERS,
  UPLOAD_ACCESS_MODES,
  createUploadStorage,
  deleteStoredFiles,
  getStoredUploadUrl,
  readUploadHeader,
  uploadFileToStorage,
} from "../../storage/uploadStorageProvider.js";

const currentFile = fileURLToPath(import.meta.url);
const backendRoot = path.resolve(path.dirname(currentFile), "../../..");
export const kycUploadsDir = path.join(backendRoot, "uploads", "kyc");

const allowedMimeTypes = new Map([
  ["image/jpeg", [".jpg", ".jpeg"]],
  ["image/png", [".png"]],
  ["image/webp", [".webp"]],
]);

function createUploadError(message, code = "INVALID_UPLOAD") {
  const error = new Error(message);
  error.statusCode = 400;
  error.code = code;
  return error;
}

function extensionForFile(file) {
  return path.extname(file.originalname || "").toLowerCase();
}

function isAllowedImage(file) {
  const allowedExtensions = allowedMimeTypes.get(file.mimetype);

  return Boolean(allowedExtensions?.includes(extensionForFile(file)));
}

function getSafeExtension(file) {
  const extension = extensionForFile(file);
  const allowedExtensions = allowedMimeTypes.get(file.mimetype);

  return allowedExtensions?.includes(extension)
    ? extension
    : allowedExtensions?.[0] || ".jpg";
}

function buildKycFilename(userId, file) {
  return `kyc-selfie-${userId}-${Date.now()}-${randomUUID()}${getSafeExtension(file)}`;
}

function publicIdFromFilename(filename) {
  return path.basename(filename, path.extname(filename));
}

function isJpeg(buffer) {
  return buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
}

function isPng(buffer) {
  return (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  );
}

function isWebp(buffer) {
  return (
    buffer.length >= 12 &&
    buffer.subarray(0, 4).toString("ascii") === "RIFF" &&
    buffer.subarray(8, 12).toString("ascii") === "WEBP"
  );
}

async function hasValidMagicBytes(file) {
  const header = await readUploadHeader(file);

  if (file.mimetype === "image/jpeg") {
    return isJpeg(header);
  }

  if (file.mimetype === "image/png") {
    return isPng(header);
  }

  if (file.mimetype === "image/webp") {
    return isWebp(header);
  }

  return false;
}

const storage = createUploadStorage({
  directory: kycUploadsDir,
  getFilename: (request, file) => buildKycFilename(request.user.id, file),
});

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024,
    files: 1,
  },
  fileFilter: (_request, file, callback) => {
    if (!isAllowedImage(file)) {
      callback(createUploadError("Only JPEG, PNG, and WebP images are allowed"));
      return;
    }

    callback(null, true);
  },
});

const sellerKycUpload = upload.fields([{ name: "selfieImage", maxCount: 1 }]);

export function uploadSellerKycImages(request, response, next) {
  sellerKycUpload(request, response, (error) => {
    if (!error) {
      next();
      return;
    }

    if (error instanceof multer.MulterError) {
      const uploadError = createUploadError(error.message, error.code);
      next(uploadError);
      return;
    }

    next(error);
  });
}

export function getKycFileUrl(request, file) {
  return getStoredUploadUrl(request, file, {
    localUrlPath: (_currentRequest, filename) => `/private-media/kyc/${filename}`,
  });
}

export function getUploadedSellerKycFiles(request) {
  return request.files?.selfieImage || [];
}

async function storeSellerKycFile(file, user) {
  if (!user?.id) {
    throw createUploadError("Authenticated user is required for uploads", "UPLOAD_USER_REQUIRED");
  }

  const filename = file.filename || buildKycFilename(user.id, file);

  await uploadFileToStorage(file, {
    folder: CLOUDINARY_UPLOAD_FOLDERS.kyc,
    publicId: publicIdFromFilename(filename),
    accessMode: UPLOAD_ACCESS_MODES.authenticated,
  });
}

export async function validateSellerKycImageFiles(request) {
  const file = request.files?.selfieImage?.[0];

  if (!file) {
    throw createUploadError("Selfie image is required", "VALIDATION_ERROR");
  }

  if (!isAllowedImage(file) || !(await hasValidMagicBytes(file))) {
    throw createUploadError("Only valid JPEG, PNG, and WebP images are allowed");
  }

  await storeSellerKycFile(file, request.user);
}

export async function deleteKycFiles(filesOrUrls) {
  await deleteStoredFiles(filesOrUrls, {
    directory: kycUploadsDir,
    folder: CLOUDINARY_UPLOAD_FOLDERS.kyc,
    accessMode: UPLOAD_ACCESS_MODES.authenticated,
  });
}
