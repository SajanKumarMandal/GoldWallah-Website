import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";

import multer from "multer";

const currentFile = fileURLToPath(import.meta.url);
const backendRoot = path.resolve(path.dirname(currentFile), "../../..");
export const jewellerVerificationUploadsDir = path.join(
  backendRoot,
  "uploads",
  "jeweller-verifications",
);

const allowedMimeTypes = new Map([
  ["image/jpeg", [".jpg", ".jpeg"]],
  ["image/png", [".png"]],
  ["image/webp", [".webp"]],
]);

fs.mkdirSync(jewellerVerificationUploadsDir, { recursive: true });

function createUploadError(message, code = "INVALID_UPLOAD") {
  const error = new Error(message);
  error.statusCode = 400;
  error.code = code;
  return error;
}

function hasAllowedExtension(file) {
  const extension = path.extname(file.originalname || "").toLowerCase();
  const allowedExtensions = allowedMimeTypes.get(file.mimetype);

  return Boolean(allowedExtensions?.includes(extension));
}

function getSafeExtension(file) {
  return allowedMimeTypes.get(file.mimetype)?.[0] || ".jpg";
}

const storage = multer.diskStorage({
  destination: (_request, _file, callback) => {
    callback(null, jewellerVerificationUploadsDir);
  },
  filename: (request, file, callback) => {
    callback(
      null,
      `jeweller-verification-${request.user.id}-${Date.now()}-${randomUUID()}${getSafeExtension(file)}`,
    );
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024,
    files: 3,
  },
  fileFilter: (_request, file, callback) => {
    if (!hasAllowedExtension(file)) {
      callback(createUploadError("Only JPEG, PNG, and WebP images are allowed"));
      return;
    }

    callback(null, true);
  },
});

const uploadFields = upload.fields([
  { name: "shopFrontImage", maxCount: 1 },
  { name: "gstCertificateImage", maxCount: 1 },
  { name: "shopLicenseImage", maxCount: 1 },
]);

export function uploadJewellerVerificationFiles(request, response, next) {
  uploadFields(request, response, (error) => {
    if (!error) {
      next();
      return;
    }

    if (error instanceof multer.MulterError) {
      next(createUploadError(error.message, error.code));
      return;
    }

    next(error);
  });
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

export function getUploadedVerificationFiles(request) {
  return [
    ...(request.files?.shopFrontImage || []),
    ...(request.files?.gstCertificateImage || []),
    ...(request.files?.shopLicenseImage || []),
  ];
}

export async function validateJewellerVerificationFiles(request) {
  if (!request.files?.shopFrontImage?.[0]) {
    throw createUploadError("Shop front image is required", "VALIDATION_ERROR");
  }

  const files = getUploadedVerificationFiles(request);

  for (const file of files) {
    if (!hasAllowedExtension(file) || !(await hasValidMagicBytes(file))) {
      throw createUploadError("Only valid JPEG, PNG, and WebP images are allowed");
    }
  }
}

export function getJewellerVerificationFileUrl(request, file) {
  if (!file) {
    return null;
  }

  const filename = path.basename(file.filename);
  return `/private-media/jeweller-verifications/${filename}`;
}

export async function deleteJewellerVerificationFiles(filesOrUrls) {
  const uploadsRoot = path.resolve(jewellerVerificationUploadsDir);

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

      const resolvedPath = path.resolve(
        path.join(jewellerVerificationUploadsDir, filename),
      );

      if (!resolvedPath.startsWith(`${uploadsRoot}${path.sep}`)) {
        return;
      }

      await fsp.rm(resolvedPath, { force: true });
    }),
  );
}
