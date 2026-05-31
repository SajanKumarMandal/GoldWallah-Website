export default function StatCard({ title, value, description, icon: Icon, tone = "green" }) {
  const toneClasses = {
    green: "bg-(--gw-color-green) text-(--gw-color-gold)",
    gold: "bg-(--gw-color-gold)/18 text-(--gw-color-green)",
    copper: "bg-(--gw-color-copper)/12 text-(--gw-color-copper)",
  };

  return (
    <article className="min-w-0 rounded-3xl border border-(--gw-color-border) bg-white/80 p-5 shadow-[0_18px_55px_rgba(26,54,45,0.08)] transition hover:-translate-y-0.5 hover:shadow-[0_24px_65px_rgba(26,54,45,0.12)]">
      <div className="flex min-w-0 items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="gw-break-text text-sm font-medium text-(--gw-color-muted)">{title}</p>
          <p className="gw-break-text mt-3 text-2xl font-semibold text-(--gw-color-green) sm:text-3xl">
            {value}
          </p>
        </div>
        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${toneClasses[tone]}`}
        >
          <Icon className="h-5 w-5" aria-hidden="true" />
        </div>
      </div>
      {description ? (
        <p className="gw-break-text mt-4 text-sm leading-6 text-(--gw-color-muted)">{description}</p>
      ) : null}
    </article>
  );
}
