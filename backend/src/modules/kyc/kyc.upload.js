import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";

import multer from "multer";

const currentFile = fileURLToPath(import.meta.url);
const backendRoot = path.resolve(path.dirname(currentFile), "../../..");
export const kycUploadsDir = path.join(backendRoot, "uploads", "kyc");

const allowedMimeTypes = new Map([
  ["image/jpeg", [".jpg", ".jpeg"]],
  ["image/png", [".png"]],
  ["image/webp", [".webp"]],
]);

fs.mkdirSync(kycUploadsDir, { recursive: true });

function createUploadError(message, code = "INVALID_UPLOAD") {
  const error = new Error(message);
  error.statusCode = 400;
  error.code = code;
  return error;
}

function isAllowedImage(file) {
  const extension = path.extname(file.originalname || "").toLowerCase();
  const allowedExtensions = allowedMimeTypes.get(file.mimetype);

  return Boolean(allowedExtensions?.includes(extension));
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
  const handle = await fsp.open(file.path, "r");

  try {
    const buffer = Buffer.alloc(12);
    const { bytesRead } = await handle.read(buffer, 0, 12, 0);
    const header = buffer.subarray(0, bytesRead);

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
  } finally {
    await handle.close();
  }
}

const storage = multer.diskStorage({
  destination: (_request, _file, callback) => {
    callback(null, kycUploadsDir);
  },
  filename: (_request, file, callback) => {
    const extension = path.extname(file.originalname || "").toLowerCase();
    const safeExtension = allowedMimeTypes.get(file.mimetype)?.[0] || ".jpg";
    callback(
      null,
      `kyc-selfie-${_request.user.id}-${Date.now()}-${randomUUID()}${extension || safeExtension}`,
    );
  },
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
  const filename = path.basename(file.filename);
  return `/private-media/kyc/${filename}`;
}

export function getUploadedSellerKycFiles(request) {
  return request.files?.selfieImage || [];
}

export async function validateSellerKycImageFiles(request) {
  const file = request.files?.selfieImage?.[0];

  if (!file) {
    throw createUploadError("Selfie image is required", "VALIDATION_ERROR");
  }

  if (!isAllowedImage(file) || !(await hasValidMagicBytes(file))) {
    throw createUploadError("Only valid JPEG, PNG, and WebP images are allowed");
  }
}

export async function deleteKycFiles(filesOrUrls) {
  const uploadsRoot = path.resolve(kycUploadsDir);

  await Promise.all(
    filesOrUrls.map(async (fileOrUrl) => {
      const fileNameSource =
        typeof fileOrUrl === "string"
          ? fileOrUrl
          : fileOrUrl.filename || fileOrUrl.imageUrl;
      const filename = path.basename(fileNameSource || "");

      if (!filename) {
        return;
      }

      const resolvedPath = path.resolve(path.join(kycUploadsDir, filename));

      if (!resolvedPath.startsWith(`${uploadsRoot}${path.sep}`)) {
        return;
      }

      await fsp.rm(resolvedPath, { force: true });
    }),
  );
}
