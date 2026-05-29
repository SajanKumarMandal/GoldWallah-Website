import { PackageOpen } from "lucide-react";
import { Link } from "react-router-dom";

import { ROUTES } from "@/constants/routes";

export default function ListingEmptyState({ canCreate }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-(--gw-color-border) bg-(--gw-color-cream)/70 px-6 py-12 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-(--gw-color-gold)/16 text-(--gw-color-green)">
        <PackageOpen className="h-6 w-6" aria-hidden="true" />
      </div>
      <h3 className="mt-4 text-lg font-semibold text-(--gw-color-green)">
        No listings yet
      </h3>
      <p className="mt-2 max-w-md text-sm leading-6 text-(--gw-color-muted)">
        Create your first listing once seller KYC is approved.
      </p>
      <Link
        to={canCreate ? ROUTES.sellerNewListing : ROUTES.sellerKyc}
        className="mt-5 inline-flex h-11 items-center justify-center rounded-full bg-(--gw-color-green) px-5 text-sm font-semibold text-(--gw-color-cream) transition hover:bg-(--gw-color-green-soft)"
      >
        {canCreate ? "Create your first listing" : "Complete KYC"}
      </Link>
    </div>
  );
}
