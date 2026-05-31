import { env } from "@/config/env";

function loadScript({ id, src }) {
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
  if (!env.googleClientId) {
    throw new Error("Google login is not configured.");
  }

  await loadScript({
    id: "google-identity-services",
    src: "https://accounts.google.com/gsi/client",
  });

  return new Promise((resolve, reject) => {
    let settled = false;

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
  if (!env.facebookAppId) {
    throw new Error("Facebook login is not configured.");
  }

  await loadScript({
    id: "facebook-jssdk",
    src: "https://connect.facebook.net/en_US/sdk.js",
  });

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
