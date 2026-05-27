import { Landmark, Store } from "lucide-react";

import { AUTH_ROLES } from "@/features/auth/utils/authConstants";

const roleOptions = [
  {
    value: AUTH_ROLES.seller,
    label: "Seller",
    description: "KYC required before listing gold.",
    icon: Store,
  },
  {
    value: AUTH_ROLES.jeweller,
    label: "Jeweller",
    description: "KYC and business verification required before bidding.",
    icon: Landmark,
  },
];

export default function RoleSelector({ value, onChange, error, disabled }) {
  return (
    <fieldset>
      <legend className="text-sm font-medium text-(--gw-color-green)">Account role</legend>
      <div className="mt-2 grid gap-3 sm:grid-cols-2">
        {roleOptions.map(({ value: optionValue, label, description, icon: Icon }) => {
          const isSelected = value === optionValue;

          return (
            <label
              key={optionValue}
              className={`cursor-pointer rounded-2xl border bg-white p-4 transition ${
                isSelected
                  ? "border-(--gw-color-gold) shadow-[0_12px_28px_rgba(209,156,76,0.18)] ring-4 ring-(--gw-color-gold)/12"
                  : "border-(--gw-color-border) hover:border-(--gw-color-gold)/65"
              } ${disabled ? "cursor-not-allowed opacity-70" : ""}`}
            >
              <input
                type="radio"
                name="role"
                value={optionValue}
                checked={isSelected}
                disabled={disabled}
                onChange={(event) => onChange(event.target.value)}
                className="sr-only"
              />
              <span className="flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-(--gw-color-green) text-(--gw-color-gold)">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <span>
                  <span className="block text-sm font-semibold text-(--gw-color-green)">
                    {label}
                  </span>
                  <span className="mt-1 block text-xs leading-5 text-(--gw-color-muted)">
                    {description}
                  </span>
                </span>
              </span>
            </label>
          );
        })}
      </div>
      {error ? (
        <p className="mt-2 text-xs font-medium text-(--gw-color-copper)">{error}</p>
      ) : null}
    </fieldset>
  );
}
