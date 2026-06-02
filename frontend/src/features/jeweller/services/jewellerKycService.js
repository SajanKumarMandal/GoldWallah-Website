import { apiRequest } from "@/services/httpClient";

function authHeaders(accessToken) {
  return accessToken ? { Authorization: `Bearer ${accessToken}` } : {};
}

export async function getMyJewellerKyc(accessToken) {
  return apiRequest("kyc/jeweller/me", {
    headers: authHeaders(accessToken),
  });
}

export async function submitJewellerKyc(formData, accessToken) {
  try {
    const result = await apiRequest("kyc/jeweller", {
      method: "POST",
      headers: authHeaders(accessToken),
      body: formData,
    });

    if (import.meta.env.DEV) {
      console.debug("Jeweller KYC API submit succeeded", { status: 201 });
    }

    return result;
  } catch (error) {
    if (import.meta.env.DEV) {
      console.warn("Jeweller KYC API submit failed", {
        status: error.status,
        message: error.message,
      });
    }

    throw error;
  }
}
