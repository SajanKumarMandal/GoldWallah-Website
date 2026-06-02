import { v2 as cloudinary } from "cloudinary";

import { env } from "../config/env.js";

let isConfigured = false;

function configureCloudinary() {
  if (isConfigured) {
    return;
  }

  cloudinary.config({
    cloud_name: env.cloudinaryCloudName,
    api_key: env.cloudinaryApiKey,
    api_secret: env.cloudinaryApiSecret,
    secure: true,
  });

  isConfigured = true;
}

function createStorageError(message, code = "CLOUDINARY_STORAGE_ERROR") {
  const error = new Error(message);
  error.statusCode = 500;
  error.code = code;
  return error;
}

export function assertCloudinaryConfigured() {
  if (
    !env.cloudinaryCloudName ||
    !env.cloudinaryApiKey ||
    !env.cloudinaryApiSecret
  ) {
    throw createStorageError(
      "Cloudinary storage is not configured. Please set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET.",
      "CLOUDINARY_NOT_CONFIGURED",
    );
  }

  configureCloudinary();
}

function uploadBuffer(file, options) {
  assertCloudinaryConfigured();

  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        resource_type: "image",
        overwrite: false,
        unique_filename: true,
        use_filename: false,
        ...options,
      },
      (error, result) => {
        if (error) {
          reject(error);
          return;
        }

        resolve(result);
      },
    );

    uploadStream.end(file.buffer);
  });
}

export async function uploadImageToCloudinary(file, {
  folder,
  publicIdPrefix,
  tags = [],
  accessMode = "public",
}) {
  if (!file?.buffer) {
    throw createStorageError("Upload file buffer is missing", "UPLOAD_BUFFER_MISSING");
  }

  const result = await uploadBuffer(file, {
    folder,
    public_id: publicIdPrefix,
    tags,
    access_mode: accessMode,
  });

  return {
    storageProvider: "cloudinary",
    publicId: result.public_id,
    secureUrl: result.secure_url,
    originalFilename: file.originalname || "",
  };
}

export async function deleteCloudinaryImages(filesOrUrls) {
  assertCloudinaryConfigured();

  const publicIds = filesOrUrls
    .map((fileOrUrl) => {
      if (!fileOrUrl) {
        return "";
      }

      if (typeof fileOrUrl === "object") {
        return fileOrUrl.cloudinaryPublicId || fileOrUrl.publicId || "";
      }

      if (typeof fileOrUrl !== "string") {
        return "";
      }

      try {
        const parsedUrl = new URL(fileOrUrl);
        const uploadIndex = parsedUrl.pathname.indexOf("/upload/");

        if (uploadIndex === -1) {
          return "";
        }

        const afterUpload = parsedUrl.pathname.slice(uploadIndex + "/upload/".length);
        const withoutVersion = afterUpload.replace(/^v\d+\//, "");
        return withoutVersion.replace(/\.[a-z0-9]+$/i, "");
      } catch {
        return "";
      }
    })
    .filter(Boolean);

  if (publicIds.length === 0) {
    return;
  }

  await Promise.allSettled(
    publicIds.map((publicId) => cloudinary.uploader.destroy(publicId, {
      resource_type: "image",
    })),
  );
}
