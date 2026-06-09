import { apiRequest } from "@/services/httpClient";
import { toApiRole } from "@/features/auth/utils/authConstants";

// Backend roles are uppercase enum values; UI state keeps lowercase labels for
// route query params and component state.
function withApiRole(payload) {
  return {
    ...payload,
    role: toApiRole(payload.role),
  };
}

function normalizeAuthResponse(result) {
  // Accept a few historical response shapes, then normalize to the one the
  // AuthProvider expects. Missing accessToken is treated as a broken session.
  const data = result?.data || {};
  const accessToken =
    data.accessToken ||
    data.token ||
    data.access_token ||
    data.tokens?.accessToken ||
    data.tokens?.access_token ||
    null;
  const user = data.user || result?.user || null;

  if (user && !accessToken) {
    if (import.meta.env.DEV) {
      console.warn("Auth response did not include an access token", {
        resultKeys: Object.keys(result || {}),
        dataKeys: Object.keys(data || {}),
        hasUser: Boolean(user),
        hasAccessToken: false,
      });
    }

    throw new Error(
      "Login session could not be created. Please check server JWT configuration.",
    );
  }

  if (import.meta.env.DEV && user) {
    console.debug("Auth response normalized", {
      hasUser: Boolean(user),
      hasAccessToken: Boolean(accessToken),
    });
  }

  return {
    ...result,
    data: {
      ...data,
      user,
      accessToken,
    },
  };
}

export async function loginUser(payload) {
  // Email/password login returns user profile plus short-lived access token.
  return normalizeAuthResponse(await apiRequest("auth/login", {
    method: "POST",
    body: JSON.stringify(payload),
  }));
}

export async function registerUser(payload) {
  // Email/password registration sends the backend-safe role enum.
  return normalizeAuthResponse(await apiRequest("auth/register", {
    method: "POST",
    body: JSON.stringify(withApiRole(payload)),
  }));
}

export async function sendLoginOtp(payload) {
  // OTP send intentionally does not reveal whether a phone number exists.
  return apiRequest("auth/otp/login/send", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function verifyLoginOtp(payload) {
  // Successful OTP verification creates the same session shape as password login.
  return normalizeAuthResponse(await apiRequest("auth/otp/login/verify", {
    method: "POST",
    body: JSON.stringify(payload),
  }));
}

export async function sendRegisterOtp(payload) {
  // Registration OTP is sent before creating the phone-only user account.
  return apiRequest("auth/otp/register/send", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function verifyRegisterOtp(payload) {
  // Phone registration creates the account only after OTP verification succeeds.
  return normalizeAuthResponse(await apiRequest("auth/otp/register/verify", {
    method: "POST",
    body: JSON.stringify(withApiRole(payload)),
  }));
}

export async function loginWithGoogle(payload) {
  // Provider login passes only the provider token; backend verifies it server-side.
  return normalizeAuthResponse(await apiRequest("auth/google/login", {
    method: "POST",
    body: JSON.stringify(payload),
  }));
}

export async function loginWithFacebook(payload) {
  // Facebook access tokens are never trusted by the client; backend validates them.
  return normalizeAuthResponse(await apiRequest("auth/facebook/login", {
    method: "POST",
    body: JSON.stringify(payload),
  }));
}

export async function registerWithGoogle(payload) {
  // Social registration still requires an explicit GoldWallah account role.
  return normalizeAuthResponse(await apiRequest("auth/google/register", {
    method: "POST",
    body: JSON.stringify(withApiRole(payload)),
  }));
}

export async function registerWithFacebook(payload) {
  // Social registration maps the selected UI role before sending it to the API.
  return normalizeAuthResponse(await apiRequest("auth/facebook/register", {
    method: "POST",
    body: JSON.stringify(withApiRole(payload)),
  }));
}

export async function refreshUserSession() {
  // Refresh uses the HttpOnly cookie sent by the browser; no refresh token is
  // exposed to frontend JavaScript.
  return normalizeAuthResponse(await apiRequest("auth/refresh", {
    method: "POST",
    body: JSON.stringify({}),
  }));
}

export async function logoutUser() {
  // Logout revokes the refresh cookie server-side and clears local auth state in
  // the caller.
  return apiRequest("auth/logout", {
    method: "POST",
    body: JSON.stringify({}),
  });
}

export async function logoutAllDevices(accessToken) {
  return apiRequest("auth/logout-all", {
    method: "POST",
    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
    body: JSON.stringify({}),
  });
}

export async function forgotPassword(payload) {
  return apiRequest("auth/password/forgot", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function resetPassword(payload) {
  return apiRequest("auth/password/reset", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function changePassword(accessToken, payload) {
  return apiRequest("auth/password/change", {
    method: "POST",
    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
    body: JSON.stringify(payload),
  });
}

export async function sendEmailVerification(accessToken) {
  return apiRequest("auth/email/verification/send", {
    method: "POST",
    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
    body: JSON.stringify({}),
  });
}

export async function verifyEmailToken(payload) {
  return apiRequest("auth/email/verification/verify", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function sendPhoneVerification(accessToken, payload = {}) {
  return apiRequest("auth/phone/verification/send", {
    method: "POST",
    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
    body: JSON.stringify(payload),
  });
}

export async function verifyPhone(accessToken, payload) {
  return apiRequest("auth/phone/verification/verify", {
    method: "POST",
    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
    body: JSON.stringify(payload),
  });
}
