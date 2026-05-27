export default function DashboardSection({ title, description, action, children }) {
  return (
    <section className="rounded-3xl border border-(--gw-color-border) bg-white/78 p-5 shadow-[0_18px_55px_rgba(26,54,45,0.07)] sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-(--gw-color-green)">{title}</h2>
          {description ? (
            <p className="mt-2 text-sm leading-6 text-(--gw-color-muted)">
              {description}
            </p>
          ) : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      <div className="mt-6">{children}</div>
    </section>
  );
}
