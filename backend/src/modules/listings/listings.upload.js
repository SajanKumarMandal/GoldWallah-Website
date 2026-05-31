import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";

import multer from "multer";

const currentFile = fileURLToPath(import.meta.url);
const backendRoot = path.resolve(path.dirname(currentFile), "../../..");
export const listingUploadsDir = path.join(backendRoot, "uploads", "listings");

// Listing product media is public. Production deployments must use shared
// persistent storage or object storage mounted behind this path.
const allowedMimeTypes = new Map([
  ["image/jpeg", [".jpg", ".jpeg"]],
  ["image/png", [".png"]],
  ["image/webp", [".webp"]],
]);

fs.mkdirSync(listingUploadsDir, { recursive: true });

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
    callback(null, listingUploadsDir);
  },
  filename: (request, file, callback) => {
    callback(
      null,
      `listing-${request.user.id}-${Date.now()}-${randomUUID()}${getSafeExtension(file)}`,
    );
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024,
    files: 5,
  },
  fileFilter: (_request, file, callback) => {
    if (!hasAllowedExtension(file)) {
      callback(createUploadError("Only JPEG, PNG, and WebP images are allowed"));
      return;
    }

    callback(null, true);
  },
});

const listingImagesUpload = upload.fields([
  { name: "listingImages", maxCount: 5 },
]);

export function uploadListingImages(request, response, next) {
  listingImagesUpload(request, response, (error) => {
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

export function getUploadedListingImageFiles(request) {
  return request.files?.listingImages || [];
}

export async function validateListingImageFiles(files, { required }) {
  if (required && files.length === 0) {
    throw createUploadError("At least one listing image is required");
  }

  if (files.length > 5) {
    throw createUploadError("A maximum of 5 listing images is allowed");
  }

  for (const file of files) {
    if (!hasAllowedExtension(file) || !(await hasValidMagicBytes(file))) {
      throw createUploadError("Only valid JPEG, PNG, and WebP images are allowed");
    }
  }
}

export function getListingFileUrl(request, file) {
  const filename = path.basename(file.filename);
  return `${request.protocol}://${request.get("host")}/uploads/listings/${filename}`;
}

export async function deleteListingFiles(filesOrUrls) {
  const uploadsRoot = path.resolve(listingUploadsDir);

  await Promise.all(
    filesOrUrls.map(async (fileOrUrl) => {
      const fileNameSource =
        typeof fileOrUrl === "string"
          ? fileOrUrl
          : fileOrUrl.filename || fileOrUrl.imageUrl;
      const filename = path.basename(
        fileNameSource || "",
      );

      if (!filename) {
        return;
      }

      const targetPath = path.join(listingUploadsDir, filename);
      const resolvedPath = path.resolve(targetPath);

      if (!resolvedPath.startsWith(`${uploadsRoot}${path.sep}`)) {
        return;
      }

      await fsp.rm(resolvedPath, { force: true });
    }),
  );
}
