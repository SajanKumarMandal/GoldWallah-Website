export default function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-(--gw-color-border) bg-(--gw-color-cream)/70 px-6 py-10 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-(--gw-color-gold)/16 text-(--gw-color-green)">
        <Icon className="h-6 w-6" aria-hidden="true" />
      </div>
      <h3 className="mt-4 text-lg font-semibold text-(--gw-color-green)">{title}</h3>
      <p className="mt-2 max-w-md text-sm leading-6 text-(--gw-color-muted)">
        {description}
      </p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}
