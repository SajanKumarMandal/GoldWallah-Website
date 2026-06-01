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

export function isSecureLocationContext() {
  if (typeof window === "undefined") {
    return false;
  }

  return (
    window.isSecureContext ||
    ["localhost", "127.0.0.1", "::1"].includes(window.location.hostname)
  );
}

export function isLocationMissingOrStale(user, staleAfterMs = 24 * 60 * 60 * 1000) {
  if (user?.profileLatitude === null || user?.profileLatitude === undefined) {
    return true;
  }

  if (user?.profileLongitude === null || user?.profileLongitude === undefined) {
    return true;
  }

  if (!user.profileLocationUpdatedAt) {
    return true;
  }

  const updatedAtMs = new Date(user.profileLocationUpdatedAt).getTime();

  return !Number.isFinite(updatedAtMs) || Date.now() - updatedAtMs > staleAfterMs;
}

export function requestBrowserLocation() {
  return new Promise((resolve, reject) => {
    if (!isSecureLocationContext()) {
      reject(new Error("Location requires HTTPS or localhost."));
      return;
    }

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
