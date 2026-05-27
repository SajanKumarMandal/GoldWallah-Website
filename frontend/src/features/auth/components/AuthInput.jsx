const baseInputClasses =
  "mt-2 h-12 w-full rounded-2xl border bg-white px-4 text-sm text-(--gw-color-green) outline-none transition placeholder:text-(--gw-color-muted)/55 focus:border-(--gw-color-gold) focus:ring-4 focus:ring-(--gw-color-gold)/15 disabled:cursor-not-allowed disabled:bg-(--gw-color-border)/35";

export default function AuthInput({
  id,
  label,
  error,
  className = "",
  type = "text",
  ...props
}) {
  const describedBy = error ? `${id}-error` : undefined;

  return (
    <div className={className}>
      <label htmlFor={id} className="text-sm font-medium text-(--gw-color-green)">
        {label}
      </label>
      <input
        id={id}
        type={type}
        aria-invalid={Boolean(error)}
        aria-describedby={describedBy}
        className={`${baseInputClasses} ${
          error ? "border-(--gw-color-copper)" : "border-(--gw-color-border)"
        }`}
        {...props}
      />
      {error ? (
        <p id={describedBy} className="mt-2 text-xs font-medium text-(--gw-color-copper)">
          {error}
        </p>
      ) : null}
    </div>
  );
}
