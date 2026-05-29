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
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-(--gw-color-muted)">
            No image
          </div>
        )}
      </div>
      <div className="space-y-4 p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="line-clamp-2 text-lg font-semibold text-(--gw-color-green)">
              {listing.title}
            </h3>
            <p className="mt-1 text-sm text-(--gw-color-muted)">
              {listing.goldType} / {listing.purity} / {listing.weightGrams}g
            </p>
          </div>
          <ListingStatusBadge status={listing.status} />
        </div>
        <p className="text-base font-semibold text-(--gw-color-green)">
          {formatMoney(listing.expectedPrice)}
        </p>
        <div className="flex items-center gap-2 text-sm text-(--gw-color-muted)">
          <MapPin className="h-4 w-4" aria-hidden="true" />
          <span>
            {listing.city}, {listing.state}
          </span>
        </div>
        <div className="flex items-center justify-between gap-3 border-t border-(--gw-color-border) pt-4">
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
