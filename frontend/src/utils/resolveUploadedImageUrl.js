import { env } from "@/config/env";

export function resolveUploadedImageUrl(imageUrl) {
  if (!imageUrl) {
    return "";
  }

  if (/^https?:\/\//i.test(imageUrl)) {
    return imageUrl;
  }

  const apiBaseUrl = env.apiBaseUrl.startsWith("http")
    ? env.apiBaseUrl
    : `${window.location.origin}${env.apiBaseUrl}`;
  const apiOrigin = new URL(apiBaseUrl).origin;

  return new URL(imageUrl, apiOrigin).toString();
}
