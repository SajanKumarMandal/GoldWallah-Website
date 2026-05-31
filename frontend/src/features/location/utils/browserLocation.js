const LOCATION_PROMPT_KEY = "goldwallah.locationPrompt.v1";

export function hasAskedLocationPermission() {
  try {
    return window.localStorage.getItem(LOCATION_PROMPT_KEY) === "asked";
  } catch {
    return false;
  }
}

export function markLocationPermissionAsked() {
  try {
    window.localStorage.setItem(LOCATION_PROMPT_KEY, "asked");
  } catch {
    // Ignore storage failures; location prompting must remain non-blocking.
  }
}

export function canUseBrowserLocation() {
  return typeof navigator !== "undefined" && Boolean(navigator.geolocation);
}

export function requestBrowserLocation() {
  return new Promise((resolve, reject) => {
    if (!canUseBrowserLocation()) {
      reject(new Error("Browser location is not supported."));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracyMeters: position.coords.accuracy,
        });
      },
      (error) => {
        reject(error);
      },
      {
        enableHighAccuracy: false,
        timeout: 10000,
        maximumAge: 10 * 60 * 1000,
      },
    );
  });
}
