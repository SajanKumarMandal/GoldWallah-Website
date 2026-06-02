import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";

import { v2 as cloudinary } from "cloudinary";
import multer from "multer";

import { env } from "../config/env.js";

export const CLOUDINARY_UPLOAD_FOLDERS = Object.freeze({
  listings: "goldwallah/listings",
  kyc: "goldwallah/kyc",
  jewellerVerifications: "goldwallah/jeweller-verifications",
});

export const UPLOAD_ACCESS_MODES = Object.freeze({
  public: "public",
  authenticated: "authenticated",
});

export const uploadStorageProvider = env.uploadStorageProvider;
export const isCloudinaryUploadStorage = uploadStorageProvider === "cloudinary";
export const isLocalUploadStorage = uploadStorageProvider === "local";

if (isCloudinaryUploadStorage) {
  cloudinary.config({
    cloud_name: env.cloudinaryCloudName,
    api_key: env.cloudinaryApiKey,
    api_secret: env.cloudinaryApiSecret,
    secure: true,
  });
}

function createStorageError(message, code, statusCode = 500) {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.code = code;
  return error;
}

function cloudinaryDeliveryType(accessMode) {
  return accessMode === UPLOAD_ACCESS_MODES.authenticated
    ? "authenticated"
    : "upload";
}

function stripExtension(value) {
  const extension = path.posix.extname(value);
  return extension ? value.slice(0, -extension.length) : value;
}

function normalizePathname(value) {
  return decodeURIComponent(value || "").replace(/\\/g, "/");
}

function sourceFromFileOrUrl(fileOrUrl) {
  if (typeof fileOrUrl === "string") {
    return fileOrUrl;
  }

  return (
    fileOrUrl?.cloudinaryPublicId ||
    fileOrUrl?.storageKey ||
    fileOrUrl?.publicId ||
    fileOrUrl?.cloudinarySecureUrl ||
    fileOrUrl?.secureUrl ||
    fileOrUrl?.url ||
    fileOrUrl?.imageUrl ||
    fileOrUrl?.selfieImageUrl ||
    fileOrUrl?.shopFrontImageUrl ||
    fileOrUrl?.gstCertificateImageUrl ||
    fileOrUrl?.shopLicenseImageUrl ||
    fileOrUrl?.filename ||
    ""
  );
}

function filenameFromSource(source) {
  if (!source) {
    return "";
  }

  try {
    const parsedUrl = new URL(source);
    return path.basename(parsedUrl.pathname);
  } catch {
    return path.basename(source);
  }
}

function cloudinaryPublicIdFromSource(source, folder) {
  if (!source) {
    return "";
  }

  if (source.startsWith(`${folder}/`) || source === folder) {
    return stripExtension(normalizePathname(source));
  }

  let pathname;

  try {
    pathname = new URL(source).pathname;
  } catch {
    pathname = source;
  }

  const normalizedPathname = normalizePathname(pathname);
  const folderMarker = `${folder}/`;
  const folderIndex = normalizedPathname.indexOf(folderMarker);

  if (folderIndex === -1) {
    return "";
  }

  const filename = normalizedPathname
    .slice(folderIndex + folderMarker.length)
    .split("/")
    .pop();

  if (!filename) {
    return "";
  }

  return `${folder}/${stripExtension(filename)}`;
}

function cloudinaryPublicIdFromFilename(filename, folder) {
  const safeFilename = path.basename(filename || "");

  if (!safeFilename) {
    return "";
  }

  return `${folder}/${stripExtension(safeFilename)}`;
}

function uploadBufferToCloudinary(buffer, options) {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      options,
      (error, result) => {
        if (error) {
          reject(error);
          return;
        }

        if (!result?.secure_url || !result.public_id) {
          reject(
            createStorageError(
              "Cloudinary upload did not return a secure asset URL",
              "CLOUDINARY_UPLOAD_INCOMPLETE",
            ),
          );
          return;
        }

        resolve(result);
      },
    );

    uploadStream.end(buffer);
  });
}

export function ensureLocalUploadDir(directory) {
  if (isLocalUploadStorage) {
    fs.mkdirSync(directory, { recursive: true });
  }
}

export function createUploadStorage({ directory, getFilename }) {
  if (isCloudinaryUploadStorage) {
    return multer.memoryStorage();
  }

  ensureLocalUploadDir(directory);

  return multer.diskStorage({
    destination: (_request, _file, callback) => {
      callback(null, directory);
    },
    filename: (request, file, callback) => {
      callback(null, getFilename(request, file));
    },
  });
}

export async function readUploadHeader(file, byteCount = 12) {
  if (file?.buffer) {
    return file.buffer.subarray(0, byteCount);
  }

  if (!file?.path) {
    throw createStorageError(
      "Uploaded file content is not available for validation",
      "UPLOAD_CONTENT_UNAVAILABLE",
      400,
    );
  }

  const handle = await fsp.open(file.path, "r");

  try {
    const buffer = Buffer.alloc(byteCount);
    const { bytesRead } = await handle.read(buffer, 0, byteCount, 0);
    return buffer.subarray(0, bytesRead);
  } finally {
    await handle.close();
  }
}

export async function uploadFileToStorage(
  file,
  { folder, publicId, accessMode },
) {
  if (isLocalUploadStorage) {
    return file;
  }

  if (!file?.buffer) {
    throw createStorageError(
      "Uploaded file content is not available",
      "UPLOAD_CONTENT_UNAVAILABLE",
      400,
    );
  }

  const result = await uploadBufferToCloudinary(file.buffer, {
    folder,
    public_id: publicId,
    resource_type: "image",
    type: cloudinaryDeliveryType(accessMode),
    overwrite: false,
    unique_filename: false,
    use_filename: false,
    invalidate: accessMode === UPLOAD_ACCESS_MODES.public,
  });

  file.storageProvider = uploadStorageProvider;
  file.storageKey = result.public_id;
  file.cloudinaryPublicId = result.public_id;
  file.cloudinarySecureUrl = result.secure_url;
  file.secureUrl = result.secure_url;
  file.filename = `${path.basename(result.public_id)}.${result.format || "jpg"}`;

  return file;
}

export function getStoredUploadUrl(request, file, { localUrlPath }) {
  if (isCloudinaryUploadStorage) {
    return file?.secureUrl || file?.cloudinarySecureUrl || "";
  }

  const filename = path.basename(file?.filename || "");
  return filename ? localUrlPath(request, filename) : "";
}

export async function deleteStoredFiles(
  filesOrUrls,
  { directory, folder, accessMode },
) {
  if (isCloudinaryUploadStorage) {
    const publicIds = new Set(
      filesOrUrls
        .map((fileOrUrl) =>
          cloudinaryPublicIdFromSource(sourceFromFileOrUrl(fileOrUrl), folder),
        )
        .filter(Boolean),
    );

    await Promise.all(
      [...publicIds].map((publicId) =>
        cloudinary.uploader.destroy(publicId, {
          resource_type: "image",
          type: cloudinaryDeliveryType(accessMode),
          invalidate: accessMode === UPLOAD_ACCESS_MODES.public,
        }),
      ),
    );
    return;
  }

  const uploadsRoot = path.resolve(directory);

  await Promise.all(
    filesOrUrls.map(async (fileOrUrl) => {
      const filename = filenameFromSource(sourceFromFileOrUrl(fileOrUrl));

      if (!filename) {
        return;
      }

      const resolvedPath = path.resolve(path.join(directory, filename));

      if (!resolvedPath.startsWith(`${uploadsRoot}${path.sep}`)) {
        return;
      }

      await fsp.rm(resolvedPath, { force: true });
    }),
  );
}

export function resolvePrivateStoredMedia({
  directory,
  filename,
  folder,
  accessMode,
  expiresInSeconds,
}) {
  if (isCloudinaryUploadStorage) {
    const publicId = cloudinaryPublicIdFromFilename(filename, folder);

    if (!publicId) {
      throw createStorageError("Private media not found", "PRIVATE_MEDIA_NOT_FOUND", 404);
    }

    return {
      redirectUrl: cloudinary.url(publicId, {
        secure: true,
        resource_type: "image",
        type: cloudinaryDeliveryType(accessMode),
        sign_url: true,
        expires_at: Math.floor(Date.now() / 1000) + expiresInSeconds,
      }),
    };
  }

  const resolvedRoot = path.resolve(directory);
  const resolvedPath = path.resolve(path.join(directory, path.basename(filename)));

  if (!resolvedPath.startsWith(`${resolvedRoot}${path.sep}`)) {
    throw createStorageError("Private media not found", "PRIVATE_MEDIA_NOT_FOUND", 404);
  }

  return {
    filename: path.basename(resolvedPath),
    root: resolvedRoot,
  };
}
