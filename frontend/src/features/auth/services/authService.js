import { apiRequest } from "@/services/httpClient";
import { ROLE_API_VALUES } from "@/features/auth/utils/authConstants";

function withApiRole(payload) {
  return {
    ...payload,
    role: ROLE_API_VALUES[payload.role] || payload.role,
  };
}

export async function loginUser(payload) {
  return apiRequest("auth/login", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function registerUser(payload) {
  return apiRequest("auth/register", {
    method: "POST",
    body: JSON.stringify(withApiRole(payload)),
  });
}

export async function sendLoginOtp(payload) {
  return apiRequest("auth/otp/login/send", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function verifyLoginOtp(payload) {
  return apiRequest("auth/otp/login/verify", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function sendRegisterOtp(payload) {
  return apiRequest("auth/otp/register/send", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function verifyRegisterOtp(payload) {
  return apiRequest("auth/otp/register/verify", {
    method: "POST",
    body: JSON.stringify(withApiRole(payload)),
  });
}

export async function loginWithGoogle(payload) {
  return apiRequest("auth/google/login", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function loginWithFacebook(payload) {
  return apiRequest("auth/facebook/login", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function registerWithGoogle(payload) {
  return apiRequest("auth/google/register", {
    method: "POST",
    body: JSON.stringify(withApiRole(payload)),
  });
}

export async function registerWithFacebook(payload) {
  return apiRequest("auth/facebook/register", {
    method: "POST",
    body: JSON.stringify(withApiRole(payload)),
  });
}
