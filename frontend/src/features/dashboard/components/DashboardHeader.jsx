export default function DashboardHeader({ eyebrow, title, description, action }) {
  return (
    <div className="flex flex-col gap-5 rounded-[2rem] bg-(--gw-color-green) p-6 text-(--gw-color-cream) shadow-[0_28px_85px_rgba(26,54,45,0.18)] sm:p-8 lg:flex-row lg:items-end lg:justify-between">
      <div className="max-w-3xl">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-(--gw-color-gold)">
          {eyebrow}
        </p>
        <h1 className="mt-4 text-3xl font-semibold leading-tight text-white sm:text-4xl">
          {title}
        </h1>
        {description ? (
          <p className="mt-4 max-w-2xl text-sm leading-6 text-white/68 sm:text-base">
            {description}
          </p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}
