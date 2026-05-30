import { Gavel, MapPin } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { useAuth } from "@/features/auth/context/useAuth";
import DashboardHeader from "@/features/dashboard/components/DashboardHeader";
import DashboardSection from "@/features/dashboard/components/DashboardSection";
import EmptyState from "@/features/dashboard/components/EmptyState";
import {
  getMarketplaceListings,
  placePrivateBid,
} from "@/features/jeweller/services/jewellerMarketplaceService";
import { resolveAssetUrl } from "@/features/seller/services/sellerListingService";

function formatMoney(value) {
  if (value === null || value === undefined || value === "") {
    return "Not set";
  }

  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(value));
}

function formatDistance(listing) {
  if (listing.distanceKm === null || listing.distanceKm === undefined) {
    return listing.matchMode === "CITY" ? "City match" : "Nearest fallback";
  }

  return `${Number(listing.distanceKm).toFixed(1)} km away`;
}

export default function JewellerMarketplacePage() {
  const { accessToken } = useAuth();
  const [listings, setListings] = useState([]);
  const [bidValues, setBidValues] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [mutatingId, setMutatingId] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [statusMessage, setStatusMessage] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadListings() {
      setIsLoading(true);
      setErrorMessage("");

      try {
        const result = await getMarketplaceListings(accessToken);

        if (isMounted) {
          setListings(result?.data || []);
        }
      } catch (error) {
        if (isMounted) {
          setErrorMessage(error.message || "Unable to load marketplace listings.");
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
  }, [accessToken]);

  const listingCount = useMemo(() => listings.length, [listings]);

  function updateBidValue(listingId, value) {
    setBidValues((current) => ({ ...current, [listingId]: value }));
  }

  async function submitBid(listing) {
    const bidAmount = Number(bidValues[listing.id]);

    if (!bidAmount || bidAmount <= 0) {
      setErrorMessage("Enter a valid bid amount.");
      return;
    }

    setMutatingId(listing.id);
    setErrorMessage("");
    setStatusMessage("");

    try {
      await placePrivateBid(accessToken, {
        listingId: listing.id,
        bidAmount,
      });
      setStatusMessage(`Private bid placed for ${listing.title}.`);
      updateBidValue(listing.id, "");
    } catch (error) {
      setErrorMessage(error.message || "Unable to place bid.");
    } finally {
      setMutatingId("");
    }
  }

  return (
    <div className="space-y-6">
      <DashboardHeader
        eyebrow="Jeweller marketplace"
        title="Nearby seller listings"
        description={`${listingCount} matched listing${listingCount === 1 ? "" : "s"} ranked by location and nearest fallback.`}
      />

      {errorMessage ? (
        <p className="rounded-2xl bg-(--gw-color-copper)/10 px-4 py-3 text-sm font-medium text-(--gw-color-copper)">
          {errorMessage}
        </p>
      ) : null}

      {statusMessage ? (
        <p className="rounded-2xl bg-(--gw-color-gold)/12 px-4 py-3 text-sm font-medium text-(--gw-color-green)">
          {statusMessage}
        </p>
      ) : null}

      <DashboardSection title="Listings">
        {isLoading ? (
          <p className="rounded-2xl bg-(--gw-color-cream) px-4 py-3 text-sm text-(--gw-color-muted)">
            Loading listings...
          </p>
        ) : null}

        {!isLoading && listings.length === 0 ? (
          <EmptyState
            icon={Gavel}
            title="No active listings"
            description="Verified seller listings will appear here when available."
          />
        ) : null}

        <div className="grid gap-4 xl:grid-cols-2">
          {listings.map((listing) => {
            const imageUrl = resolveAssetUrl(listing.images?.[0]?.imageUrl);

            return (
              <article
                key={listing.id}
                className="grid gap-4 rounded-2xl border border-(--gw-color-border) bg-white p-4 sm:grid-cols-[10rem_1fr]"
              >
                <div className="aspect-[4/3] overflow-hidden rounded-2xl bg-(--gw-color-cream)">
                  {imageUrl ? (
                    <img
                      src={imageUrl}
                      alt={listing.title}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-sm text-(--gw-color-muted)">
                      No image
                    </div>
                  )}
                </div>

                <div className="min-w-0">
                  <h2 className="text-base font-semibold text-(--gw-color-green)">
                    {listing.title}
                  </h2>
                  <p className="mt-1 text-sm text-(--gw-color-muted)">
                    {listing.goldType} / {listing.purity} / {listing.weightGrams}g
                  </p>
                  <p className="mt-2 text-sm font-semibold text-(--gw-color-green)">
                    Expected: {formatMoney(listing.expectedPrice)}
                  </p>
                  <p className="mt-2 flex items-center gap-2 text-sm text-(--gw-color-muted)">
                    <MapPin className="h-4 w-4" aria-hidden="true" />
                    {listing.city}, {listing.state}
                  </p>
                  <p className="mt-2 text-xs font-semibold uppercase tracking-[0.16em] text-(--gw-color-muted)">
                    {formatDistance(listing)} / {listing.matchMode || "MATCHED"}
                  </p>

                  <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                    <input
                      type="number"
                      min="1"
                      value={bidValues[listing.id] || ""}
                      onChange={(event) => updateBidValue(listing.id, event.target.value)}
                      placeholder="Bid amount"
                      className="h-11 min-w-0 flex-1 rounded-full border border-(--gw-color-border) px-4 text-sm outline-none focus:border-(--gw-color-gold)"
                    />
                    <button
                      type="button"
                      disabled={mutatingId === listing.id}
                      onClick={() => submitBid(listing)}
                      className="inline-flex h-11 items-center justify-center rounded-full bg-(--gw-color-green) px-5 text-sm font-semibold text-(--gw-color-cream) transition hover:bg-(--gw-color-green-soft) disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      {mutatingId === listing.id ? "Placing..." : "Place bid"}
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </DashboardSection>
    </div>
  );
}
