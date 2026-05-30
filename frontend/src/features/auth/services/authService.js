import { apiRequest } from "@/services/httpClient";
import { ROLE_API_VALUES } from "@/features/auth/utils/authConstants";

function withApiRole(payload) {
  return {
    ...payload,
    role: ROLE_API_VALUES[payload.role] || payload.role,
  };
}

function normalizeAuthResponse(result) {
  const data = result?.data || {};
  const accessToken =
    data.accessToken ||
    data.token ||
    data.access_token ||
    data.tokens?.accessToken ||
    data.tokens?.access_token ||
    null;
  const refreshToken =
    data.refreshToken ||
    data.refresh_token ||
    data.tokens?.refreshToken ||
    data.tokens?.refresh_token ||
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
      hasRefreshToken: Boolean(refreshToken),
    });
  }

  return {
    ...result,
    data: {
      ...data,
      user,
      accessToken,
      refreshToken,
    },
  };
}

export async function loginUser(payload) {
  return normalizeAuthResponse(await apiRequest("auth/login", {
    method: "POST",
    body: JSON.stringify(payload),
  }));
}

export async function registerUser(payload) {
  return normalizeAuthResponse(await apiRequest("auth/register", {
    method: "POST",
    body: JSON.stringify(withApiRole(payload)),
  }));
}

export async function sendLoginOtp(payload) {
  return apiRequest("auth/otp/login/send", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function verifyLoginOtp(payload) {
  return normalizeAuthResponse(await apiRequest("auth/otp/login/verify", {
    method: "POST",
    body: JSON.stringify(payload),
  }));
}

export async function sendRegisterOtp(payload) {
  return apiRequest("auth/otp/register/send", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function verifyRegisterOtp(payload) {
  return normalizeAuthResponse(await apiRequest("auth/otp/register/verify", {
    method: "POST",
    body: JSON.stringify(withApiRole(payload)),
  }));
}

export async function loginWithGoogle(payload) {
  return normalizeAuthResponse(await apiRequest("auth/google/login", {
    method: "POST",
    body: JSON.stringify(payload),
  }));
}

export async function loginWithFacebook(payload) {
  return normalizeAuthResponse(await apiRequest("auth/facebook/login", {
    method: "POST",
    body: JSON.stringify(payload),
  }));
}

export async function registerWithGoogle(payload) {
  return normalizeAuthResponse(await apiRequest("auth/google/register", {
    method: "POST",
    body: JSON.stringify(withApiRole(payload)),
  }));
}

export async function registerWithFacebook(payload) {
  return normalizeAuthResponse(await apiRequest("auth/facebook/register", {
    method: "POST",
    body: JSON.stringify(withApiRole(payload)),
  }));
}

export async function refreshUserSession(refreshToken) {
  return normalizeAuthResponse(await apiRequest("auth/refresh", {
    method: "POST",
    body: JSON.stringify({ refreshToken }),
  }));
}

export async function logoutUser(refreshToken) {
  return apiRequest("auth/logout", {
    method: "POST",
    body: JSON.stringify({ refreshToken }),
  });
}
