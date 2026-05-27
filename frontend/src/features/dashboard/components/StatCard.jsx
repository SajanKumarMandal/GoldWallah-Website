export default function StatCard({ title, value, description, icon: Icon, tone = "green" }) {
  const toneClasses = {
    green: "bg-(--gw-color-green) text-(--gw-color-gold)",
    gold: "bg-(--gw-color-gold)/18 text-(--gw-color-green)",
    copper: "bg-(--gw-color-copper)/12 text-(--gw-color-copper)",
  };

  return (
    <article className="rounded-3xl border border-(--gw-color-border) bg-white/80 p-5 shadow-[0_18px_55px_rgba(26,54,45,0.08)] transition hover:-translate-y-0.5 hover:shadow-[0_24px_65px_rgba(26,54,45,0.12)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-(--gw-color-muted)">{title}</p>
          <p className="mt-3 text-3xl font-semibold text-(--gw-color-green)">
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
        <p className="mt-4 text-sm leading-6 text-(--gw-color-muted)">{description}</p>
      ) : null}
    </article>
  );
}
