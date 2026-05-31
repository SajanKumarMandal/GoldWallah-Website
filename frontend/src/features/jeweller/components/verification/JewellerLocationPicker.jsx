import { LocateFixed } from "lucide-react";
import { useState } from "react";

export default function JewellerLocationPicker({
  values,
  errors,
  disabled,
  onChange,
}) {
  const [geoMessage, setGeoMessage] = useState("");
  const [isLocating, setIsLocating] = useState(false);
  const canUseGeo = "geolocation" in navigator;

  function useCurrentLocation() {
    if (!canUseGeo) {
      setGeoMessage("Location capture is not supported on this browser.");
      return;
    }

    setGeoMessage("");
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        onChange("latitude", String(position.coords.latitude.toFixed(7)));
        onChange("longitude", String(position.coords.longitude.toFixed(7)));
        setGeoMessage("Location coordinates added.");
        setIsLocating(false);
      },
      () => {
        setGeoMessage(
          "Location permission is required for nearby seller matching. You can also enter latitude and longitude manually.",
        );
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  return (
    <div className="grid min-w-0 gap-5 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] md:items-end">
      <Field
        id="latitude"
        label="Latitude"
        value={values.latitude}
        error={errors.latitude}
        disabled={disabled}
        inputMode="decimal"
        onChange={(value) => onChange("latitude", value)}
      />
      <Field
        id="longitude"
        label="Longitude"
        value={values.longitude}
        error={errors.longitude}
        disabled={disabled}
        inputMode="decimal"
        onChange={(value) => onChange("longitude", value)}
      />
      <button
        type="button"
        onClick={useCurrentLocation}
        disabled={disabled || isLocating}
        className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-full border border-(--gw-color-border) bg-white px-5 text-sm font-semibold text-(--gw-color-green) transition hover:border-(--gw-color-gold) disabled:cursor-not-allowed disabled:opacity-60 md:w-auto"
      >
        <LocateFixed className="h-4 w-4" aria-hidden="true" />
        {isLocating ? "Locating..." : "Use current location"}
      </button>
      {geoMessage ? (
        <p className="gw-break-text text-xs font-medium text-(--gw-color-muted) md:col-span-3">
          {geoMessage}
        </p>
      ) : null}
    </div>
  );
}

function Field({ id, label, value, onChange, disabled, error, ...props }) {
  return (
    <label className="block min-w-0" htmlFor={id}>
      <span className="text-sm font-semibold text-(--gw-color-green)">{label}</span>
      <input
        id={id}
        type="text"
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 h-12 w-full rounded-2xl border border-(--gw-color-border) bg-white px-4 text-sm text-(--gw-color-green) outline-none transition focus:border-(--gw-color-gold) focus:ring-4 focus:ring-(--gw-color-gold)/15 disabled:cursor-not-allowed disabled:bg-(--gw-color-border)/35"
        {...props}
      />
      {error ? (
        <p className="mt-2 text-xs font-medium text-(--gw-color-copper)">
          {error}
        </p>
      ) : null}
    </label>
  );
}
