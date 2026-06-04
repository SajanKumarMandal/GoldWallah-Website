import { env } from "@/config/env";

function loadScript({ id, src }) {
  // Load provider SDKs once per page session; repeated social button clicks
  // reuse the existing script instead of injecting duplicates.
  return new Promise((resolve, reject) => {
    const existingScript = document.getElementById(id);

    if (existingScript) {
      resolve();
      return;
    }

    const script = document.createElement("script");
    script.id = id;
    script.src = src;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Unable to load identity provider"));
    document.head.appendChild(script);
  });
}

export async function getGoogleIdToken() {
  // The browser only collects Google's ID token. Account lookup, audience
  // checks, and email verification happen on the backend.
  if (!env.googleClientId) {
    throw new Error("Google login is not configured.");
  }

  await loadScript({
    id: "google-identity-services",
    src: "https://accounts.google.com/gsi/client",
  });

  return new Promise((resolve, reject) => {
    let settled = false;

    // Google Identity Services returns a credential through this callback when
    // the user chooses or confirms an account.
    window.google.accounts.id.initialize({
      client_id: env.googleClientId,
      callback: (response) => {
        settled = true;
        if (response?.credential) {
          resolve(response.credential);
          return;
        }
        reject(new Error("Google login was cancelled."));
      },
    });

    // Treat a skipped or blocked One Tap prompt as a user-visible login failure.
    window.google.accounts.id.prompt((notification) => {
      if (
        !settled &&
        (notification.isNotDisplayed() || notification.isSkippedMoment())
      ) {
        settled = true;
        reject(new Error("Google login could not be opened."));
      }
    });
  });
}

export async function getFacebookAccessToken() {
  // The browser obtains a Facebook access token; backend validates app id,
  // profile ownership, and email before creating a session.
  if (!env.facebookAppId) {
    throw new Error("Facebook login is not configured.");
  }

  await loadScript({
    id: "facebook-jssdk",
    src: "https://connect.facebook.net/en_US/sdk.js",
  });

  // Disable Facebook cookies/XFBML here because GoldWallah handles session
  // state through its own backend-issued HttpOnly cookie.
  window.FB.init({
    appId: env.facebookAppId,
    cookie: false,
    xfbml: false,
    version: "v20.0",
  });

  return new Promise((resolve, reject) => {
    window.FB.login(
      (response) => {
        const accessToken = response?.authResponse?.accessToken;

        if (!accessToken) {
          reject(new Error("Facebook login was cancelled."));
          return;
        }

        resolve(accessToken);
      },
      { scope: "email", return_scopes: true },
    );
  });
}
