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
export const listingUploadsDir = path.join(backendRoot, "uploads", "listings");

// Listing product media is public. Production uses Cloudinary; local disk is
// kept only for development/test through the selected storage provider.
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

function hasAllowedExtension(file) {
  const extension = path.extname(file.originalname || "").toLowerCase();
  const allowedExtensions = allowedMimeTypes.get(file.mimetype);

  return Boolean(allowedExtensions?.includes(extension));
}

function getSafeExtension(file) {
  return allowedMimeTypes.get(file.mimetype)?.[0] || ".jpg";
}

function buildListingFilename(userId, file) {
  return `listing-${userId}-${Date.now()}-${randomUUID()}${getSafeExtension(file)}`;
}

function publicIdFromFilename(filename) {
  return path.basename(filename, path.extname(filename));
}

const storage = createUploadStorage({
  directory: listingUploadsDir,
  getFilename: (request, file) => buildListingFilename(request.user.id, file),
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

async function storeListingImageFiles(files, user) {
  if (files.length === 0) {
    return;
  }

  if (!user?.id) {
    throw createUploadError("Authenticated user is required for uploads", "UPLOAD_USER_REQUIRED");
  }

  for (const file of files) {
    const filename = file.filename || buildListingFilename(user.id, file);

    await uploadFileToStorage(file, {
      folder: CLOUDINARY_UPLOAD_FOLDERS.listings,
      publicId: publicIdFromFilename(filename),
      accessMode: UPLOAD_ACCESS_MODES.public,
    });
  }
}

export function getUploadedListingImageFiles(request) {
  return request.files?.listingImages || [];
}

export async function validateListingImageFiles(files, { required, user }) {
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

  await storeListingImageFiles(files, user);
}

export function getListingFileUrl(request, file) {
  return getStoredUploadUrl(request, file, {
    localUrlPath: (currentRequest, filename) =>
      `${currentRequest.protocol}://${currentRequest.get("host")}/uploads/listings/${filename}`,
  });
}

export async function deleteListingFiles(filesOrUrls) {
  await deleteStoredFiles(filesOrUrls, {
    directory: listingUploadsDir,
    folder: CLOUDINARY_UPLOAD_FOLDERS.listings,
    accessMode: UPLOAD_ACCESS_MODES.public,
  });
}
