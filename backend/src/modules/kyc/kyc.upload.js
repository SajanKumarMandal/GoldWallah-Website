import fs from "node:fs";
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
  return `${request.protocol}://${request.get("host")}/uploads/kyc/${filename}`;
}
