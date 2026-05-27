const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const INDIAN_PHONE_PATTERN = /^(\+91[\s-]?)?[6-9]\d{9}$/;
const OTP_PATTERN = /^(\d{4}|\d{6})$/;

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
  } else if (!EMAIL_PATTERN.test(values.email)) {
    errors.email = "Enter a valid email address.";
  }

  if (!values.password) {
    errors.password = "Password is required.";
  } else if (values.password.length < 8) {
    errors.password = "Password must be at least 8 characters.";
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

  if (!values.fullName.trim()) {
    errors.fullName = "Full name is required.";
  }

  if (!values.email.trim()) {
    errors.email = "Email is required.";
  } else if (!EMAIL_PATTERN.test(values.email)) {
    errors.email = "Enter a valid email address.";
  }

  if (!values.phone.trim()) {
    errors.phone = "Phone number is required.";
  } else if (!validateIndianPhone(values.phone)) {
    errors.phone = "Enter a valid Indian phone number.";
  }

  if (!values.password) {
    errors.password = "Password is required.";
  } else if (values.password.length < 8) {
    errors.password = "Password must be at least 8 characters.";
  }

  if (!values.confirmPassword) {
    errors.confirmPassword = "Confirm your password.";
  } else if (values.confirmPassword !== values.password) {
    errors.confirmPassword = "Passwords must match.";
  }

  if (!values.role) {
    errors.role = "Choose an account role.";
  }

  if (!values.acceptTerms) {
    errors.acceptTerms = "Accept the terms to continue.";
  }

  return errors;
}

export function validateRegisterOtpSendForm(values) {
  const errors = {};

  if (!values.fullName.trim()) {
    errors.fullName = "Full name is required.";
  }

  if (!values.phone.trim()) {
    errors.phone = "Phone number is required.";
  } else if (!validateIndianPhone(values.phone)) {
    errors.phone = "Enter a valid Indian phone number.";
  }

  if (!values.role) {
    errors.role = "Choose an account role.";
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

  if (!values.role) {
    errors.role = "Choose an account role.";
  }

  return errors;
}
