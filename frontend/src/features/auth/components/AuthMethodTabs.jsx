// Segmented control used to switch between email/password and mobile OTP auth.
export default function AuthMethodTabs({ activeMethod, methods, onChange }) {
  return (
    <div className="grid min-w-0 grid-cols-2 rounded-full border border-(--gw-color-border) bg-white p-1">
      {methods.map((method) => {
        // Active state is derived from parent form state so tab changes can
        // also reset validation and status messages there.
        const isActive = activeMethod === method.value;

        return (
          <button
            key={method.value}
            type="button"
            onClick={() => onChange(method.value)}
            className={`h-10 min-w-0 rounded-full px-2 text-sm font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--gw-color-gold) sm:px-4 ${
              isActive
                ? "bg-(--gw-color-green) text-(--gw-color-cream) shadow"
                : "text-(--gw-color-muted) hover:text-(--gw-color-green)"
            }`}
          >
            {method.label}
          </button>
        );
      })}
    </div>
  );
}
