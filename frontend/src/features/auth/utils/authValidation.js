import { isValidAuthRole } from "@/features/auth/utils/authConstants";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const INDIAN_PHONE_PATTERN = /^(\+91[\s-]?)?[6-9]\d{9}$/;
const OTP_PATTERN = /^(\d{4}|\d{6})$/;
const FULL_NAME_PATTERN = /^[\p{L}\p{M}.' -]+$/u;
const MIN_PASSWORD_LENGTH = 10;
const MAX_PASSWORD_LENGTH = 128;

function validatePassword(password) {
  if (!password) {
    return "Password is required.";
  }

  if (password.length < MIN_PASSWORD_LENGTH) {
    return `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
  }

  if (password.length > MAX_PASSWORD_LENGTH) {
    return "Password is too long.";
  }

  if (/^\s|\s$/.test(password)) {
    return "Password cannot start or end with spaces.";
  }

  return "";
}

function validateFullName(fullName) {
  const trimmedName = fullName.trim();

  if (!trimmedName) {
    return "Full name is required.";
  }

  if (trimmedName.length < 2) {
    return "Full name must be at least 2 characters.";
  }

  if (trimmedName.length > 120) {
    return "Full name is too long.";
  }

  if (!FULL_NAME_PATTERN.test(trimmedName)) {
    return "Full name contains unsupported characters.";
  }

  return "";
}

function validateRole(role) {
  return isValidAuthRole(role) ? "" : "Choose a valid account role.";
}

export function validateIndianPhone(phone) {
  return INDIAN_PHONE_PATTERN.test(phone.trim());
}

export function validateOtp(otp) {
  return OTP_PATTERN.test(otp.trim());
}

export function validateLoginForm(values) {
  const errors = {};

  if (!values.email.trim()) {
    errors.email = "Email is required.";
  } else if (!EMAIL_PATTERN.test(values.email.trim())) {
    errors.email = "Enter a valid email address.";
  }

  if (!values.password) {
    errors.password = "Password is required.";
  }

  return errors;
}

export function validateLoginOtpSendForm(values) {
  const errors = {};

  if (!values.phone.trim()) {
    errors.phone = "Phone number is required.";
  } else if (!validateIndianPhone(values.phone)) {
    errors.phone = "Enter a valid Indian phone number.";
  }

  return errors;
}

export function validateLoginOtpVerifyForm(values) {
  const errors = validateLoginOtpSendForm(values);

  if (!values.otp.trim()) {
    errors.otp = "OTP is required.";
  } else if (!validateOtp(values.otp)) {
    errors.otp = "OTP must be 4 or 6 digits.";
  }

  return errors;
}

export function validateRegisterForm(values) {
  const errors = {};
  const fullNameError = validateFullName(values.fullName);
  const passwordError = validatePassword(values.password);
  const roleError = validateRole(values.role);

  if (fullNameError) {
    errors.fullName = fullNameError;
  }

  if (!values.email.trim()) {
    errors.email = "Email is required.";
  } else if (!EMAIL_PATTERN.test(values.email.trim())) {
    errors.email = "Enter a valid email address.";
  }

  if (!values.phone.trim()) {
    errors.phone = "Phone number is required.";
  } else if (!validateIndianPhone(values.phone)) {
    errors.phone = "Enter a valid Indian phone number.";
  }

  if (passwordError) {
    errors.password = passwordError;
  }

  if (!values.confirmPassword) {
    errors.confirmPassword = "Confirm your password.";
  } else if (values.confirmPassword !== values.password) {
    errors.confirmPassword = "Passwords must match.";
  }

  if (roleError) {
    errors.role = roleError;
  }

  if (!values.acceptTerms) {
    errors.acceptTerms = "Accept the terms to continue.";
  }

  return errors;
}

export function validateRegisterOtpSendForm(values) {
  const errors = {};
  const fullNameError = validateFullName(values.fullName);
  const roleError = validateRole(values.role);

  if (fullNameError) {
    errors.fullName = fullNameError;
  }

  if (!values.phone.trim()) {
    errors.phone = "Phone number is required.";
  } else if (!validateIndianPhone(values.phone)) {
    errors.phone = "Enter a valid Indian phone number.";
  }

  if (roleError) {
    errors.role = roleError;
  }

  if (!values.acceptTerms) {
    errors.acceptTerms = "Accept the terms to continue.";
  }

  return errors;
}

export function validateRegisterOtpVerifyForm(values) {
  const errors = validateRegisterOtpSendForm(values);

  if (!values.otp.trim()) {
    errors.otp = "OTP is required.";
  } else if (!validateOtp(values.otp)) {
    errors.otp = "OTP must be 4 or 6 digits.";
  }

  return errors;
}

export function validateSocialRegisterForm(values) {
  const errors = {};
  const roleError = validateRole(values.role);

  if (roleError) {
    errors.role = roleError;
  }

  if (!values.acceptTerms) {
    errors.acceptTerms = "Accept the terms to continue.";
  }

  return errors;
}
