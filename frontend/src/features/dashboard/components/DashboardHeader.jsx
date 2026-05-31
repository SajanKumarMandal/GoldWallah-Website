export default function DashboardHeader({ eyebrow, title, description, action }) {
  return (
    <div className="flex min-w-0 flex-col gap-5 rounded-3xl bg-(--gw-color-green) p-5 text-(--gw-color-cream) shadow-[0_28px_85px_rgba(26,54,45,0.18)] sm:p-8 lg:flex-row lg:items-end lg:justify-between">
      <div className="min-w-0 max-w-3xl">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-(--gw-color-gold) sm:tracking-[0.24em]">
          {eyebrow}
        </p>
        <h1 className="gw-break-text gw-text-section mt-4 font-semibold leading-tight text-white">
          {title}
        </h1>
        {description ? (
          <p className="gw-text-body mt-4 max-w-2xl leading-6 text-white/68">
            {description}
          </p>
        ) : null}
      </div>
      {action ? (
        <div className="min-w-0 shrink-0 [&>*]:w-full sm:[&>*]:w-auto">
          {action}
        </div>
      ) : null}
    </div>
  );
}
