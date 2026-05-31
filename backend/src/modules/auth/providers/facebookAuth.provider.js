import { createHmac } from "node:crypto";

import { env } from "../../../config/env.js";

function providerError(message, statusCode, code) {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.code = code;
  return error;
}

function appSecretProof(accessToken) {
  return createHmac("sha256", env.facebookAppSecret)
    .update(accessToken)
    .digest("hex");
}

async function fetchFacebookJson(url) {
  const response = await fetch(url);
  const body = await response.json().catch(() => null);

  if (!response.ok || body?.error) {
    throw providerError("Invalid Facebook token", 401, "INVALID_FACEBOOK_TOKEN");
  }

  return body;
}

export async function verifyFacebookAccessToken(accessToken) {
  if (!env.facebookAppId || !env.facebookAppSecret) {
    throw providerError("Facebook login is not configured", 503, "FACEBOOK_NOT_CONFIGURED");
  }

  const proof = appSecretProof(accessToken);
  const appAccessToken = `${env.facebookAppId}|${env.facebookAppSecret}`;
  const debugUrl = new URL("https://graph.facebook.com/debug_token");
  debugUrl.searchParams.set("input_token", accessToken);
  debugUrl.searchParams.set("access_token", appAccessToken);

  const debugResult = await fetchFacebookJson(debugUrl);
  const tokenData = debugResult.data;

  if (
    !tokenData?.is_valid ||
    tokenData.app_id !== env.facebookAppId ||
    !tokenData.user_id
  ) {
    throw providerError("Invalid Facebook token", 401, "INVALID_FACEBOOK_TOKEN");
  }

  const profileUrl = new URL("https://graph.facebook.com/me");
  profileUrl.searchParams.set("fields", "id,name,email");
  profileUrl.searchParams.set("access_token", accessToken);
  profileUrl.searchParams.set("appsecret_proof", proof);

  const profile = await fetchFacebookJson(profileUrl);

  if (!profile?.id || !profile.email) {
    throw providerError(
      "Facebook account must provide a verified email",
      401,
      "FACEBOOK_EMAIL_REQUIRED",
    );
  }

  if (profile.id !== tokenData.user_id) {
    throw providerError("Invalid Facebook token", 401, "INVALID_FACEBOOK_TOKEN");
  }

  return {
    provider: "FACEBOOK",
    providerSubject: profile.id,
    email: profile.email.toLowerCase(),
    fullName: profile.name || profile.email.split("@")[0],
    isEmailVerified: true,
  };
}
