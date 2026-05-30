function formatDate(value) {
  if (!value) {
    return "Not available";
  }

  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export default function PendingVerificationList({ items, isLoading }) {
  return (
    <section className="rounded-3xl border border-(--gw-color-border) bg-white p-5 shadow-sm">
      <h2 className="text-lg font-semibold text-(--gw-color-green)">
        Pending verifications
      </h2>
      {isLoading ? <SkeletonRows /> : null}
      {!isLoading && items.length === 0 ? (
        <p className="mt-4 rounded-2xl bg-(--gw-color-cream) px-4 py-3 text-sm text-(--gw-color-muted)">
          No pending verification requests right now.
        </p>
      ) : null}
      {!isLoading && items.length > 0 ? (
        <div className="mt-4 space-y-3">
          {items.map((item) => (
            <div
              key={`${item.type}-${item.id}`}
              className="rounded-2xl border border-(--gw-color-border) bg-(--gw-color-cream)/70 p-4"
            >
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-semibold text-(--gw-color-green)">
                    {item.displayName || "Unnamed submission"}
                  </p>
                  <p className="mt-1 text-xs uppercase tracking-[0.16em] text-(--gw-color-muted)">
                    {item.type}
                  </p>
                </div>
                <span className="w-fit rounded-full bg-(--gw-color-gold)/18 px-3 py-1 text-xs font-semibold text-(--gw-color-green)">
                  {item.status}
                </span>
              </div>
              <p className="mt-3 text-xs text-(--gw-color-muted)">
                Submitted {formatDate(item.submittedAt)}
              </p>
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}

function SkeletonRows() {
  return (
    <div className="mt-4 space-y-3">
      {[1, 2, 3].map((item) => (
        <div
          key={item}
          className="h-20 animate-pulse rounded-2xl bg-(--gw-color-cream)"
        />
      ))}
    </div>
  );
}
