import { apiRequest } from "@/services/httpClient";

function authHeaders(accessToken) {
  // Admin APIs use a separate Bearer access token from normal user APIs.
  return accessToken ? { Authorization: `Bearer ${accessToken}` } : {};
}

export async function loginAdmin({ email, password, mfaCode }) {
  // Optional MFA code is included only when provided by the admin.
  return apiRequest("admin/auth/login", {
    method: "POST",
    body: JSON.stringify({
      email,
      password,
      ...(mfaCode ? { mfaCode } : {}),
    }),
  });
}

export async function refreshAdminSession() {
  // Uses the admin HttpOnly refresh cookie to issue a new access token.
  return apiRequest("admin/auth/refresh", {
    method: "POST",
    body: JSON.stringify({}),
  });
}

export async function getAdminMe(accessToken) {
  // Reads the current admin profile and permissions for protected admin screens.
  return apiRequest("admin/auth/me", {
    headers: authHeaders(accessToken),
  });
}

export async function logoutAdmin(accessToken) {
  // Revokes the server-side admin refresh token and clears the cookie.
  return apiRequest("admin/auth/logout", {
    method: "POST",
    headers: authHeaders(accessToken),
    body: JSON.stringify({}),
  });
}

export async function changeAdminPassword(accessToken, payload) {
  // Required for admins marked mustChangePassword before they can use the console.
  return apiRequest("admin/auth/change-password", {
    method: "POST",
    headers: authHeaders(accessToken),
    body: JSON.stringify(payload),
  });
}

export async function beginAdminMfaSetup(accessToken, payload) {
  // Starts MFA enrollment and returns setup material from the backend.
  return apiRequest("admin/auth/mfa/setup", {
    method: "POST",
    headers: authHeaders(accessToken),
    body: JSON.stringify(payload),
  });
}

export async function confirmAdminMfaSetup(accessToken, payload) {
  // Confirms MFA enrollment with a generated TOTP code.
  return apiRequest("admin/auth/mfa/confirm", {
    method: "POST",
    headers: authHeaders(accessToken),
    body: JSON.stringify(payload),
  });
}
