export default function AuthMethodTabs({ activeMethod, methods, onChange }) {
  return (
    <div className="grid grid-cols-2 rounded-full border border-(--gw-color-border) bg-white p-1">
      {methods.map((method) => {
        const isActive = activeMethod === method.value;

        return (
          <button
            key={method.value}
            type="button"
            onClick={() => onChange(method.value)}
            className={`h-10 rounded-full px-4 text-sm font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--gw-color-gold) ${
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
