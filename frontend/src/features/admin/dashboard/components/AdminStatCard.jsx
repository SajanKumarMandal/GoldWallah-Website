export default function AdminStatCard({ label, value, tone = "green", isLoading }) {
  const toneClass =
    tone === "gold"
      ? "bg-(--gw-color-gold)/14 text-(--gw-color-green)"
      : tone === "copper"
        ? "bg-(--gw-color-copper)/10 text-(--gw-color-copper)"
        : "bg-white text-(--gw-color-green)";

  return (
    <div className={`rounded-3xl border border-(--gw-color-border) p-5 shadow-sm ${toneClass}`}>
      <p className="text-xs font-semibold uppercase tracking-[0.16em] opacity-70">
        {label}
      </p>
      {isLoading ? (
        <div className="mt-4 h-8 w-24 animate-pulse rounded-full bg-(--gw-color-border)" />
      ) : (
        <p className="mt-3 text-3xl font-semibold">{value ?? 0}</p>
      )}
    </div>
  );
}
