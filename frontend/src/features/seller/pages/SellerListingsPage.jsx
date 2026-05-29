import { LockKeyhole, Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { ROUTES } from "@/constants/routes";
import { useAuth } from "@/features/auth/context/useAuth";
import DashboardHeader from "@/features/dashboard/components/DashboardHeader";
import DashboardSection from "@/features/dashboard/components/DashboardSection";
import ListingCard from "@/features/seller/components/listings/ListingCard";
import ListingEmptyState from "@/features/seller/components/listings/ListingEmptyState";
import { getMyListings } from "@/features/seller/services/sellerListingService";

const STATUS_FILTERS = ["ALL", "ACTIVE", "BID_ACCEPTED", "SOLD", "CANCELLED"];

export default function SellerListingsPage() {
  const { accessToken, user } = useAuth();
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [listings, setListings] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const hasApprovedKyc = user?.kycStatus === "APPROVED";

  useEffect(() => {
    let isMounted = true;

    async function loadListings() {
      setIsLoading(true);
      setErrorMessage("");

      try {
        const result = await getMyListings(accessToken, {
          status: statusFilter === "ALL" ? undefined : statusFilter,
        });

        if (isMounted) {
          setListings(result?.data || []);
        }
      } catch (error) {
        if (isMounted) {
          setErrorMessage(error.message || "Unable to load listings.");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadListings();

    return () => {
      isMounted = false;
    };
  }, [accessToken, statusFilter]);

  return (
    <div className="space-y-6">
      <DashboardHeader
        eyebrow="Seller listings"
        title="My gold listings"
        description="Manage your own gold and jewellery listings. Listing creation requires approved seller KYC."
        action={
          hasApprovedKyc ? (
            <Link
              to={ROUTES.sellerNewListing}
              className="inline-flex h-11 items-center gap-2 rounded-full bg-(--gw-color-gold) px-5 text-sm font-semibold text-(--gw-color-green) transition hover:bg-[#e0ad62]"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              Create Listing
            </Link>
          ) : (
            <Link
              to={ROUTES.sellerKyc}
              className="inline-flex h-11 items-center gap-2 rounded-full border border-white/20 bg-white/10 px-5 text-sm font-semibold text-white transition hover:bg-white/15"
            >
              <LockKeyhole className="h-4 w-4" aria-hidden="true" />
              Complete KYC
            </Link>
          )
        }
      />

      {!hasApprovedKyc ? (
        <div className="rounded-3xl border border-(--gw-color-gold)/45 bg-(--gw-color-gold)/10 p-5 text-(--gw-color-green)">
          <h2 className="text-lg font-semibold">KYC approval is required to create listings.</h2>
          <p className="mt-1 text-sm text-(--gw-color-muted)">
            Existing seller dashboard access remains available while listing creation is locked.
          </p>
        </div>
      ) : null}

      <DashboardSection title="Listing inventory">
        <div className="mb-5 flex flex-wrap gap-2">
          {STATUS_FILTERS.map((status) => (
            <button
              key={status}
              type="button"
              onClick={() => setStatusFilter(status)}
              className={`h-10 rounded-full px-4 text-sm font-semibold transition ${
                statusFilter === status
                  ? "bg-(--gw-color-green) text-(--gw-color-cream)"
                  : "border border-(--gw-color-border) bg-white text-(--gw-color-green) hover:border-(--gw-color-gold)"
              }`}
            >
              {status === "ALL" ? "All" : status.replace("_", " ")}
            </button>
          ))}
        </div>

        {isLoading ? (
          <p className="rounded-2xl bg-(--gw-color-cream) px-4 py-3 text-sm text-(--gw-color-muted)">
            Loading listings...
          </p>
        ) : null}

        {errorMessage ? (
          <p className="rounded-2xl bg-(--gw-color-copper)/10 px-4 py-3 text-sm font-medium text-(--gw-color-copper)">
            {errorMessage}
          </p>
        ) : null}

        {!isLoading && !errorMessage && listings.length === 0 ? (
          <ListingEmptyState canCreate={hasApprovedKyc} />
        ) : null}

        {listings.length > 0 ? (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {listings.map((listing) => (
              <ListingCard key={listing.id} listing={listing} />
            ))}
          </div>
        ) : null}
      </DashboardSection>
    </div>
  );
}
