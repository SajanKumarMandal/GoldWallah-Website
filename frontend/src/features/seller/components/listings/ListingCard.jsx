import { Eye, MapPin } from "lucide-react";
import { Link } from "react-router-dom";

import { ROUTES } from "@/constants/routes";
import ListingStatusBadge from "@/features/seller/components/listings/ListingStatusBadge";
import { resolveAssetUrl } from "@/features/seller/services/sellerListingService";

function formatMoney(value) {
  if (value === null || value === undefined || value === "") {
    return "Expected price not set";
  }

  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(value));
}

function formatDate(value) {
  if (!value) {
    return "Not available";
  }

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

export default function ListingCard({ listing }) {
  const firstImage = resolveAssetUrl(listing.images?.[0]?.imageUrl);

  return (
    <article className="overflow-hidden rounded-3xl border border-(--gw-color-border) bg-white shadow-[0_18px_55px_rgba(26,54,45,0.08)]">
      <div className="aspect-[4/3] bg-(--gw-color-border)/45">
        {firstImage ? (
          <img
            src={firstImage}
            alt={listing.title}
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-(--gw-color-muted)">
            No image
          </div>
        )}
      </div>
      <div className="space-y-4 p-4 sm:p-5">
        <div className="flex flex-col gap-3 min-[420px]:flex-row min-[420px]:items-start min-[420px]:justify-between">
          <div className="min-w-0">
            <h3 className="gw-break-text line-clamp-2 text-lg font-semibold text-(--gw-color-green)">
              {listing.title}
            </h3>
            <p className="gw-break-text mt-1 text-sm text-(--gw-color-muted)">
              {listing.goldType} / {listing.purity} / {listing.weightGrams}g
            </p>
          </div>
          <div className="shrink-0">
            <ListingStatusBadge status={listing.status} />
          </div>
        </div>
        <p className="text-base font-semibold text-(--gw-color-green)">
          {formatMoney(listing.expectedPrice)}
        </p>
        <div className="flex min-w-0 items-center gap-2 text-sm text-(--gw-color-muted)">
          <MapPin className="h-4 w-4" aria-hidden="true" />
          <span className="gw-break-text min-w-0">
            {listing.city}, {listing.state}
          </span>
        </div>
        <div className="flex flex-col gap-3 border-t border-(--gw-color-border) pt-4 min-[420px]:flex-row min-[420px]:items-center min-[420px]:justify-between">
          <p className="text-xs font-medium text-(--gw-color-muted)">
            {formatDate(listing.createdAt)}
          </p>
          <Link
            to={ROUTES.sellerListingDetail.replace(":listingId", listing.id)}
            className="inline-flex h-10 items-center gap-2 rounded-full bg-(--gw-color-green) px-4 text-sm font-semibold text-(--gw-color-cream) transition hover:bg-(--gw-color-green-soft)"
          >
            <Eye className="h-4 w-4" aria-hidden="true" />
            View
          </Link>
        </div>
      </div>
    </article>
  );
}
