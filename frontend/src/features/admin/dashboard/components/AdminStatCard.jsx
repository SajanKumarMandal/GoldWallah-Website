export default function AdminStatCard({ label, value, tone = "green", isLoading }) {
  const toneClass =
    tone === "gold"
      ? "bg-(--gw-color-gold)/14 text-(--gw-color-green)"
      : tone === "copper"
        ? "bg-(--gw-color-copper)/10 text-(--gw-color-copper)"
        : "bg-white text-(--gw-color-green)";

  return (
    <div className={`min-w-0 rounded-3xl border border-(--gw-color-border) p-5 shadow-sm ${toneClass}`}>
      <p className="gw-break-text text-xs font-semibold uppercase tracking-[0.14em] opacity-70 sm:tracking-[0.16em]">
        {label}
      </p>
      {isLoading ? (
        <div className="mt-4 h-8 w-24 animate-pulse rounded-full bg-(--gw-color-border)" />
      ) : (
        <p className="gw-break-text mt-3 text-2xl font-semibold sm:text-3xl">{value ?? 0}</p>
      )}
    </div>
  );
}
