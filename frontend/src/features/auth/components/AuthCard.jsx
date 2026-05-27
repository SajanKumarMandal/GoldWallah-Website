export default function AuthCard({ title, description, children, footer }) {
  return (
    <div className="mx-auto w-full rounded-[1.5rem] border border-(--gw-color-border) bg-(--gw-color-cream) p-5 text-(--gw-color-green) shadow-[0_28px_90px_rgba(0,0,0,0.18)] sm:p-7 xl:p-8">
      <div>
        <h2 className="text-2xl font-semibold sm:text-3xl">{title}</h2>
        <p className="mt-3 text-sm leading-6 text-(--gw-color-muted)">{description}</p>
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
