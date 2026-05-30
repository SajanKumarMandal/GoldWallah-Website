import { formatAuditDate } from "@/features/admin/dashboard/components/auditFormat";

export default function RecentAuditLogList({ items, isLoading }) {
  return (
    <section className="rounded-3xl border border-(--gw-color-border) bg-white p-5 shadow-sm">
      <h2 className="text-lg font-semibold text-(--gw-color-green)">
        Recent audit logs
      </h2>
      {isLoading ? <SkeletonRows /> : null}
      {!isLoading && items.length === 0 ? (
        <p className="mt-4 rounded-2xl bg-(--gw-color-cream) px-4 py-3 text-sm text-(--gw-color-muted)">
          No audit activity has been recorded yet.
        </p>
      ) : null}
      {!isLoading && items.length > 0 ? (
        <div className="mt-4 divide-y divide-(--gw-color-border)">
          {items.map((item, index) => (
            <div key={`${item.action}-${item.createdAt}-${index}`} className="py-3">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm font-semibold text-(--gw-color-green)">
                  {item.action}
                </p>
                <span className="w-fit rounded-full bg-(--gw-color-cream) px-3 py-1 text-xs font-semibold text-(--gw-color-muted)">
                  {item.severity}
                </span>
              </div>
              <p className="mt-1 text-xs text-(--gw-color-muted)">
                {item.actorAdminName || "System"} · {item.resourceType}
                {item.resourceId ? ` · ${item.resourceId}` : ""} ·{" "}
                {formatAuditDate(item.createdAt)}
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
          className="h-14 animate-pulse rounded-2xl bg-(--gw-color-cream)"
        />
      ))}
    </div>
  );
}
