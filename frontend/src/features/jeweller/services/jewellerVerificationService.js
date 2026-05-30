import { apiRequest } from "@/services/httpClient";

function authHeaders(accessToken) {
  return accessToken ? { Authorization: `Bearer ${accessToken}` } : {};
}

function mapServiceError(error) {
  if (error.status === 401) {
    error.message = "Please login again.";
  } else if (error.status === 403) {
    error.message = "Jeweller account required.";
  } else if (error.status === 409) {
    error.message = error.message || "This verification request cannot be submitted.";
  } else if (error.status === 400) {
    error.message = error.message || "Please check the verification details.";
  }

  throw error;
}

export async function getMyJewellerVerification(accessToken) {
  try {
    return await apiRequest("jeweller/verification/me", {
      headers: authHeaders(accessToken),
    });
  } catch (error) {
    mapServiceError(error);
  }
}

export async function submitJewellerVerification(formData, accessToken) {
  try {
    return await apiRequest("jeweller/verification", {
      method: "POST",
      headers: authHeaders(accessToken),
      body: formData,
    });
  } catch (error) {
    mapServiceError(error);
  }
}
