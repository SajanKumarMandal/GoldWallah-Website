const MAX_SELFIE_SIZE_BYTES = 5 * 1024 * 1024;
const ALLOWED_SELFIE_TYPES = ["image/jpeg", "image/png", "image/webp"];

export function normalizeKycField(name, value) {
  if (name === "mobileNumber" || name === "aadhaarNumber") {
    return value.replace(/\D/g, "");
  }

  if (name === "panNumber") {
    return value.toUpperCase();
  }

  return value;
}

export function validateSellerKycForm(values) {
  const errors = {};
  const fullName = values.fullName.trim();
  const addressAsPerAadhaar = values.addressAsPerAadhaar.trim();

  if (fullName.length < 2) {
    errors.fullName = "Full name must be at least 2 characters.";
  } else if (fullName.length > 150) {
    errors.fullName = "Full name must be 150 characters or fewer.";
  }

  if (!/^[0-9]{10}$/.test(values.mobileNumber)) {
    errors.mobileNumber = "Mobile number must be exactly 10 digits.";
  }

  if (addressAsPerAadhaar.length < 10) {
    errors.addressAsPerAadhaar = "Address must be at least 10 characters.";
  } else if (addressAsPerAadhaar.length > 500) {
    errors.addressAsPerAadhaar = "Address must be 500 characters or fewer.";
  }

  if (!/^[0-9]{12}$/.test(values.aadhaarNumber)) {
    errors.aadhaarNumber = "Aadhaar number must be exactly 12 digits.";
  }

  if (!/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(values.panNumber)) {
    errors.panNumber = "PAN must use format ABCDE1234F.";
  }

  if (!values.selfieImage) {
    errors.selfieImage = "Capture a selfie before submitting.";
  } else if (!values.selfiePreviewUrl) {
    errors.selfieImage = "Captured selfie preview is not ready. Please retake.";
  } else if (!values.selfieCapturedAt) {
    errors.selfieImage = "Capture a fresh selfie before submitting.";
  } else if (!ALLOWED_SELFIE_TYPES.includes(values.selfieImage.type)) {
    errors.selfieImage = "Selfie must be a JPEG, PNG, or WebP image.";
  } else if (values.selfieImage.size > MAX_SELFIE_SIZE_BYTES) {
    errors.selfieImage = "Selfie image must be 5MB or smaller.";
  }

  return errors;
}

export function buildSellerKycFormData(values) {
  const formData = new FormData();

  formData.append("fullName", values.fullName.trim());
  formData.append("mobileNumber", values.mobileNumber);
  formData.append("addressAsPerAadhaar", values.addressAsPerAadhaar.trim());
  formData.append("aadhaarNumber", values.aadhaarNumber);
  formData.append("panNumber", values.panNumber);
  formData.append("selfieCapturedAt", values.selfieCapturedAt);
  formData.append("selfieImage", values.selfieImage);

  return formData;
}
