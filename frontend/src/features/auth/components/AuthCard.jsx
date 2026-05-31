export default function AuthCard({ title, description, children, footer }) {
  return (
    <div className="mx-auto w-full min-w-0 rounded-[1.5rem] border border-(--gw-color-border) bg-(--gw-color-cream) p-4 text-(--gw-color-green) shadow-[0_28px_90px_rgba(0,0,0,0.18)] sm:p-7 xl:p-8">
      <div>
        <h2 className="gw-break-text gw-text-card font-semibold">{title}</h2>
        <p className="gw-text-small mt-3 leading-6 text-(--gw-color-muted)">{description}</p>
      </div>

      <div className="mt-8">{children}</div>

      {footer ? (
        <div className="mt-7 border-t border-(--gw-color-border) pt-6 text-center text-sm text-(--gw-color-muted)">
          {footer}
        </div>
      ) : null}
    </div>
  );
}
