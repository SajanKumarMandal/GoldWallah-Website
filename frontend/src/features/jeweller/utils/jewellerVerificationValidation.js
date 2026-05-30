import { BUSINESS_TYPES } from "@/features/jeweller/constants/jewellerVerificationStatus";

export const MAX_VERIFICATION_IMAGE_SIZE = 5 * 1024 * 1024;
export const ALLOWED_VERIFICATION_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
];

const gstPattern = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;
const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/;

export function normalizeJewellerVerificationValues(values) {
  return {
    ...values,
    shopName: values.shopName.trim(),
    ownerName: values.ownerName.trim(),
    businessMobile: values.businessMobile.replace(/\D/g, ""),
    businessEmail: values.businessEmail.trim(),
    gstNumber: values.gstNumber.trim().toUpperCase(),
    shopLicenseNumber: values.shopLicenseNumber.trim().toUpperCase(),
    businessAddress: values.businessAddress.trim(),
    city: values.city.trim(),
    state: values.state.trim(),
    pincode: values.pincode.trim(),
    shopOpeningTime: values.shopOpeningTime.trim(),
    shopClosingTime: values.shopClosingTime.trim(),
    yearsInBusiness: values.yearsInBusiness.trim(),
    businessType: values.businessType.trim(),
    latitude: values.latitude.trim(),
    longitude: values.longitude.trim(),
  };
}

export function validateVerificationImage(file, { required = false } = {}) {
  if (!file) {
    return required ? "This image is required." : "";
  }

  if (!ALLOWED_VERIFICATION_IMAGE_TYPES.includes(file.type)) {
    return "Only JPEG, PNG, and WebP images are allowed.";
  }

  if (file.size > MAX_VERIFICATION_IMAGE_SIZE) {
    return "Image must be 5MB or smaller.";
  }

  return "";
}

export function validateJewellerVerification(values, images) {
  const data = normalizeJewellerVerificationValues(values);
  const errors = {};
  const latitude = Number(data.latitude);
  const longitude = Number(data.longitude);

  if (data.shopName.length < 2) {
    errors.shopName = "Shop name must be at least 2 characters.";
  } else if (data.shopName.length > 160) {
    errors.shopName = "Shop name must be 160 characters or fewer.";
  }

  if (data.ownerName.length < 2) {
    errors.ownerName = "Owner name must be at least 2 characters.";
  } else if (data.ownerName.length > 160) {
    errors.ownerName = "Owner name must be 160 characters or fewer.";
  }

  if (!/^\d{10,15}$/.test(data.businessMobile)) {
    errors.businessMobile = "Business mobile must be 10 to 15 digits.";
  }

  if (
    data.businessEmail &&
    (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.businessEmail) ||
      data.businessEmail.length > 255)
  ) {
    errors.businessEmail = "Enter a valid business email.";
  }

  if (!data.gstNumber && !data.shopLicenseNumber) {
    errors.gstNumber = "Provide either GST number or shop license number.";
    errors.shopLicenseNumber = "Provide either GST number or shop license number.";
  }

  if (data.gstNumber && !gstPattern.test(data.gstNumber)) {
    errors.gstNumber = "GST number must be valid.";
  }

  if (
    data.shopLicenseNumber &&
    (data.shopLicenseNumber.length < 4 || data.shopLicenseNumber.length > 80)
  ) {
    errors.shopLicenseNumber = "Shop license number must be 4 to 80 characters.";
  }

  if (data.businessAddress.length < 10) {
    errors.businessAddress = "Business address must be at least 10 characters.";
  } else if (data.businessAddress.length > 1000) {
    errors.businessAddress = "Business address must be 1000 characters or fewer.";
  }

  if (!data.city) {
    errors.city = "City is required.";
  } else if (data.city.length > 100) {
    errors.city = "City must be 100 characters or fewer.";
  }

  if (!data.state) {
    errors.state = "State is required.";
  } else if (data.state.length > 100) {
    errors.state = "State must be 100 characters or fewer.";
  }

  if (!/^\d{6}$/.test(data.pincode)) {
    errors.pincode = "Pincode must be exactly 6 digits.";
  }

  if (!data.latitude || !Number.isFinite(latitude) || latitude < -90 || latitude > 90) {
    errors.latitude = "Latitude must be between -90 and 90.";
  }

  if (
    !data.longitude ||
    !Number.isFinite(longitude) ||
    longitude < -180 ||
    longitude > 180
  ) {
    errors.longitude = "Longitude must be between -180 and 180.";
  }

  if (data.shopOpeningTime && !timePattern.test(data.shopOpeningTime)) {
    errors.shopOpeningTime = "Opening time must use HH:mm format.";
  }

  if (data.shopClosingTime && !timePattern.test(data.shopClosingTime)) {
    errors.shopClosingTime = "Closing time must use HH:mm format.";
  }

  if (
    data.yearsInBusiness &&
    (!Number.isInteger(Number(data.yearsInBusiness)) ||
      Number(data.yearsInBusiness) < 0 ||
      Number(data.yearsInBusiness) > 150)
  ) {
    errors.yearsInBusiness = "Years in business must be between 0 and 150.";
  }

  if (data.businessType && !BUSINESS_TYPES.includes(data.businessType)) {
    errors.businessType = "Select a valid business type.";
  }

  const shopFrontImageError = validateVerificationImage(images.shopFrontImage, {
    required: true,
  });
  const gstCertificateImageError = validateVerificationImage(
    images.gstCertificateImage,
  );
  const shopLicenseImageError = validateVerificationImage(
    images.shopLicenseImage,
  );

  if (shopFrontImageError) {
    errors.shopFrontImage = shopFrontImageError;
  }

  if (gstCertificateImageError) {
    errors.gstCertificateImage = gstCertificateImageError;
  }

  if (shopLicenseImageError) {
    errors.shopLicenseImage = shopLicenseImageError;
  }

  return { errors, data };
}
