import { useCallback, useState } from "react";

import { updateMyLocation } from "@/features/location/services/locationService";
import {
  isLocationMissingOrStale,
  requestBrowserLocation,
} from "@/features/location/utils/browserLocation";

function getLocationErrorState(error) {
  if (error?.code === 1) {
    return {
      status: "denied",
      message: "Location permission was denied. Showing closest available options.",
    };
  }

  if (error?.code === 2) {
    return {
      status: "unavailable",
      message: "Location is unavailable. Showing closest available options.",
    };
  }

  if (error?.code === 3) {
    return {
      status: "timeout",
      message: "Location request timed out. Showing closest available options.",
    };
  }

  return {
    status: "blocked",
    message: error?.message || "Location could not be updated.",
  };
}

export function useGeolocation({ accessToken, setAuthUser }) {
  const [locationState, setLocationState] = useState({
    status: "idle",
    message: "",
  });

  const ensureFreshLocation = useCallback(
    async (user, options = {}) => {
      if (!accessToken || !user) {
        return { ok: false, skipped: true };
      }

      if (!options.force && !isLocationMissingOrStale(user)) {
        setLocationState({ status: "fresh", message: "" });
        return { ok: true, skipped: true };
      }

      setLocationState({
        status: "requesting",
        message: "Requesting browser location...",
      });

      try {
        const browserLocation = await requestBrowserLocation();
        const result = await updateMyLocation(accessToken, browserLocation);

        if (result?.data) {
          setAuthUser(result.data);
        }

        setLocationState({
          status: "updated",
          message: "",
        });

        return {
          ok: true,
          location: browserLocation,
          user: result?.data || user,
        };
      } catch (error) {
        const errorState = getLocationErrorState(error);
        setLocationState(errorState);

        return {
          ok: false,
          error,
          ...errorState,
        };
      }
    },
    [accessToken, setAuthUser],
  );

  return {
    locationState,
    ensureFreshLocation,
  };
}

