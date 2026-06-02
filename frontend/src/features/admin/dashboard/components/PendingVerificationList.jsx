import { Link } from "react-router-dom";

import { ROUTES } from "@/constants/routes";

const detailRouteByType = {
  SELLER_KYC: ROUTES.adminKycDetail,
  JEWELLER_KYC: ROUTES.adminJewellerKycDetail,
  BUSINESS_VERIFICATION: ROUTES.adminBusinessVerificationDetail,
};

const detailPermissionByType = {
  SELLER_KYC: "admin.kyc.seller.view",
  JEWELLER_KYC: "admin.kyc.jeweller.view",
  BUSINESS_VERIFICATION: "admin.business.view",
};

function hasPermission(admin, permission) {
  return admin?.isSuperAdmin || admin?.permissions?.includes(permission);
}

function getDetailPath(item, admin) {
  const template = detailRouteByType[item.type];
  const permission = detailPermissionByType[item.type];

  if (!template || !item.id || !hasPermission(admin, permission)) {
    return "";
  }

  return template
    .replace(":kycId", encodeURIComponent(String(item.id)))
    .replace(":verificationId", encodeURIComponent(String(item.id)));
}

function formatDate(value) {
  if (!value) {
    return "Not available";
  }

  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export default function PendingVerificationList({ admin, items, isLoading }) {
  return (
    <section className="min-w-0 rounded-3xl border border-(--gw-color-border) bg-white p-5 shadow-sm">
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
          {items.map((item) => {
            const detailPath = getDetailPath(item, admin);
            const className =
              "block rounded-2xl border border-(--gw-color-border) bg-(--gw-color-cream)/70 p-4 transition hover:border-(--gw-color-gold)/60 hover:bg-(--gw-color-cream)";
            const content = (
              <>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="gw-break-text font-semibold text-(--gw-color-green)">
                      {item.displayName || "Unnamed submission"}
                    </p>
                    <p className="gw-break-text mt-1 text-xs uppercase tracking-[0.16em] text-(--gw-color-muted)">
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
              </>
            );

            if (detailPath) {
              return (
                <Link
                  key={`${item.type}-${item.id}`}
                  to={detailPath}
                  className={className}
                >
                  {content}
                </Link>
              );
            }

            return (
              <div key={`${item.type}-${item.id}`} className={className}>
                {content}
              </div>
            );
          })}
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
