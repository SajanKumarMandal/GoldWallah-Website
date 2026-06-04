import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";

// Password field with local-only visibility toggle. The password value remains
// controlled by the parent form and is never persisted by this component.
export default function PasswordInput({ id, label, error, className = "", ...props }) {
  const [isVisible, setIsVisible] = useState(false);
  // Link screen readers to the inline validation message only when needed.
  const describedBy = error ? `${id}-error` : undefined;

  return (
    <div className={className}>
      <label htmlFor={id} className="text-sm font-medium text-(--gw-color-green)">
        {label}
      </label>
      <div className="relative mt-2">
        <input
          id={id}
          type={isVisible ? "text" : "password"}
          aria-invalid={Boolean(error)}
          aria-describedby={describedBy}
          className={`h-12 w-full rounded-2xl border bg-white px-4 pr-12 text-sm text-(--gw-color-green) outline-none transition placeholder:text-(--gw-color-muted)/55 focus:border-(--gw-color-gold) focus:ring-4 focus:ring-(--gw-color-gold)/15 disabled:cursor-not-allowed disabled:bg-(--gw-color-border)/35 ${
            error ? "border-(--gw-color-copper)" : "border-(--gw-color-border)"
          }`}
          {...props}
        />
        <button
          type="button"
          className="absolute right-2 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-(--gw-color-muted) transition hover:bg-(--gw-color-border)/55 hover:text-(--gw-color-green) focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--gw-color-gold)"
          onClick={() => setIsVisible((current) => !current)}
          aria-label={isVisible ? "Hide password" : "Show password"}
        >
          {isVisible ? (
            <EyeOff className="h-4 w-4" aria-hidden="true" />
          ) : (
            <Eye className="h-4 w-4" aria-hidden="true" />
          )}
        </button>
      </div>
      {error ? (
        <p id={describedBy} className="mt-2 text-xs font-medium text-(--gw-color-copper)">
          {error}
        </p>
      ) : null}
    </div>
  );
}
