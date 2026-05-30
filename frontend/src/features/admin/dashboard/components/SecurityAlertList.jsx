import { AlertTriangle } from "lucide-react";

import { formatAuditDate } from "@/features/admin/dashboard/components/auditFormat";

export default function SecurityAlertList({ items, isLoading }) {
  return (
    <section className="rounded-3xl border border-(--gw-color-copper)/25 bg-(--gw-color-copper)/8 p-5 shadow-sm">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-(--gw-color-copper)">
          <AlertTriangle className="h-5 w-5" aria-hidden="true" />
        </span>
        <div>
          <h2 className="text-lg font-semibold text-(--gw-color-copper)">
            Security alerts
          </h2>
          <p className="text-xs text-(--gw-color-muted)">Last 24 hours</p>
        </div>
      </div>

      {isLoading ? <SkeletonRows /> : null}
      {!isLoading && items.length === 0 ? (
        <p className="mt-4 rounded-2xl bg-white px-4 py-3 text-sm text-(--gw-color-muted)">
          No warning or critical admin security events in the last 24 hours.
        </p>
      ) : null}
      {!isLoading && items.length > 0 ? (
        <div className="mt-4 space-y-3">
          {items.map((item, index) => (
            <div
              key={`${item.action}-${item.createdAt}-${index}`}
              className="rounded-2xl bg-white p-4"
            >
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm font-semibold text-(--gw-color-green)">
                  {item.action}
                </p>
                <span className="w-fit rounded-full bg-(--gw-color-copper)/10 px-3 py-1 text-xs font-semibold text-(--gw-color-copper)">
                  {item.severity}
                </span>
              </div>
              <p className="mt-1 text-xs text-(--gw-color-muted)">
                {item.actorAdminName || "System"} · {item.resourceType} ·{" "}
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
      {[1, 2].map((item) => (
        <div key={item} className="h-16 animate-pulse rounded-2xl bg-white" />
      ))}
    </div>
  );
}
