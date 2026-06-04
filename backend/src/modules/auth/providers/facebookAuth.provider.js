import { createHmac } from "node:crypto";

import { env } from "../../../config/env.js";

function providerError(message, statusCode, code) {
  // Provider-specific failures are normalized before reaching the controller.
  const error = new Error(message);
  error.statusCode = statusCode;
  error.code = code;
  return error;
}

function appSecretProof(accessToken) {
  // Facebook recommends appsecret_proof to bind Graph API profile calls to this
  // app and reduce token replay risk.
  return createHmac("sha256", env.facebookAppSecret)
    .update(accessToken)
    .digest("hex");
}

async function fetchFacebookJson(url) {
  // Centralize Graph API fetch/error handling so both debug_token and profile
  // calls fail closed on provider errors.
  const response = await fetch(url);
  const body = await response.json().catch(() => null);

  if (!response.ok || body?.error) {
    throw providerError("Invalid Facebook token", 401, "INVALID_FACEBOOK_TOKEN");
  }

  return body;
}

export async function verifyFacebookAccessToken(accessToken) {
  // Verify token ownership against GoldWallah's app before trusting any profile
  // fields returned by Facebook.
  if (!env.facebookAppId || !env.facebookAppSecret) {
    throw providerError("Facebook login is not configured", 503, "FACEBOOK_NOT_CONFIGURED");
  }

  const proof = appSecretProof(accessToken);
  const appAccessToken = `${env.facebookAppId}|${env.facebookAppSecret}`;
  const debugUrl = new URL("https://graph.facebook.com/debug_token");
  debugUrl.searchParams.set("input_token", accessToken);
  debugUrl.searchParams.set("access_token", appAccessToken);

  // debug_token confirms the token is valid, belongs to this app, and maps to a
  // real Facebook user id.
  const debugResult = await fetchFacebookJson(debugUrl);
  const tokenData = debugResult.data;

  if (
    !tokenData?.is_valid ||
    tokenData.app_id !== env.facebookAppId ||
    !tokenData.user_id
  ) {
    throw providerError("Invalid Facebook token", 401, "INVALID_FACEBOOK_TOKEN");
  }

  // Fetch the minimal profile needed to map the Facebook user to a GoldWallah
  // account. Email is required for account uniqueness/linking.
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

  // Build a normalized provider profile consumed by the shared OAuth service.
  return {
    provider: "FACEBOOK",
    providerSubject: profile.id,
    email: profile.email.toLowerCase(),
    fullName: profile.name || profile.email.split("@")[0],
    isEmailVerified: true,
  };
}
