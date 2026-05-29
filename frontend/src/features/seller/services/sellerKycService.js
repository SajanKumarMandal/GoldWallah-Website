import { apiRequest } from "@/services/httpClient";

function authHeaders(accessToken) {
  return accessToken ? { Authorization: `Bearer ${accessToken}` } : {};
}

export async function getMySellerKyc(accessToken) {
  return apiRequest("kyc/seller/me", {
    headers: authHeaders(accessToken),
  });
}

export async function submitSellerKyc(formData, accessToken) {
  try {
    const result = await apiRequest("kyc/seller", {
      method: "POST",
      headers: authHeaders(accessToken),
      body: formData,
    });

    if (import.meta.env.DEV) {
      console.debug("Seller KYC API submit succeeded", { status: 201 });
    }

    return result;
  } catch (error) {
    if (import.meta.env.DEV) {
      console.warn("Seller KYC API submit failed", {
        status: error.status,
        message: error.message,
      });
    }

    throw error;
  }
}

export const getSellerKyc = getMySellerKyc;
