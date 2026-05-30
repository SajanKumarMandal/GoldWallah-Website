import { ArrowLeft, Edit3, Gavel, MapPin, XCircle } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";

import { ROUTES } from "@/constants/routes";
import { useAuth } from "@/features/auth/context/useAuth";
import DashboardHeader from "@/features/dashboard/components/DashboardHeader";
import DashboardSection from "@/features/dashboard/components/DashboardSection";
import ListingForm from "@/features/seller/components/listings/ListingForm";
import ListingStatusBadge from "@/features/seller/components/listings/ListingStatusBadge";
import {
  acceptBid,
  getListingBids,
  rejectBid,
} from "@/features/seller/services/sellerBidService";
import {
  cancelListing,
  getListingById,
  resolveAssetUrl,
  updateListing,
} from "@/features/seller/services/sellerListingService";

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

function formatDate(value) {
  if (!value) {
    return "Not available";
  }

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export default function SellerListingDetailPage() {
  const { listingId } = useParams();
  const { accessToken } = useAuth();
  const [listing, setListing] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [isCancelling, setIsCancelling] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bids, setBids] = useState([]);
  const [bidActionId, setBidActionId] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadListing() {
      setIsLoading(true);
      setErrorMessage("");

      try {
        const result = await getListingById(listingId, accessToken);

        if (isMounted) {
          setListing(result?.data || null);
        }
      } catch (error) {
        if (isMounted) {
          setErrorMessage(error.message || "Unable to load listing.");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadListing();

    return () => {
      isMounted = false;
    };
  }, [accessToken, listingId]);

  useEffect(() => {
    let isMounted = true;

    async function loadBids() {
      try {
        const result = await getListingBids(accessToken, listingId);

        if (isMounted) {
          setBids(result?.data || []);
        }
      } catch {
        if (isMounted) {
          setBids([]);
        }
      }
    }

    loadBids();

    return () => {
      isMounted = false;
    };
  }, [accessToken, listingId, listing?.status]);

  const resolvedImages = useMemo(
    () =>
      (listing?.images || []).map((image) => ({
        ...image,
        imageUrl: resolveAssetUrl(image.imageUrl),
      })),
    [listing],
  );
  const isActive = listing?.status === "ACTIVE";

  async function handleCancelListing() {
    const confirmed = window.confirm("Cancel this listing? This cannot be undone.");

    if (!confirmed) {
      return;
    }

    setIsCancelling(true);
    setErrorMessage("");
    setStatusMessage("");

    try {
      const result = await cancelListing(listingId, accessToken);
      setListing(result?.data || null);
      setIsEditing(false);
      setStatusMessage("Listing cancelled.");
    } catch (error) {
      setErrorMessage(error.message || "Unable to cancel listing.");
    } finally {
      setIsCancelling(false);
    }
  }

  async function handleUpdateListing(formData) {
    setIsSubmitting(true);
    setErrorMessage("");
    setStatusMessage("");

    try {
      const result = await updateListing(listingId, formData, accessToken);
      setListing(result?.data || null);
      setIsEditing(false);
      setStatusMessage("Listing updated.");
    } catch (error) {
      const message = error.message || "Unable to update listing.";
      setErrorMessage(
        message.includes("active") || message.includes("status")
          ? "This listing is no longer active."
          : message,
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleBidDecision(bid, action) {
    setBidActionId(bid.id);
    setErrorMessage("");
    setStatusMessage("");

    try {
      const result =
        action === "accept"
          ? await acceptBid(accessToken, bid.id)
          : await rejectBid(accessToken, bid.id);
      setBids((currentBids) =>
        currentBids.map((currentBid) =>
          currentBid.id === bid.id
            ? { ...currentBid, ...result?.data }
            : action === "accept" && currentBid.status === "PENDING"
              ? { ...currentBid, status: "REJECTED" }
              : currentBid,
        ),
      );
      setStatusMessage(action === "accept" ? "Bid accepted." : "Bid rejected.");
      if (action === "accept") {
        setListing((currentListing) =>
          currentListing
            ? {
                ...currentListing,
                status: "BID_ACCEPTED",
                acceptedBidId: bid.id,
              }
            : currentListing,
        );
      }
    } catch (error) {
      setErrorMessage(error.message || "Unable to update bid.");
    } finally {
      setBidActionId("");
    }
  }

  return (
    <div className="space-y-6">
      <DashboardHeader
        eyebrow="Seller listing"
        title={listing?.title || "Listing details"}
        description="Review and manage the gold listing details visible from your seller workspace."
        action={
          <Link
            to={ROUTES.sellerListings}
            className="inline-flex h-11 items-center gap-2 rounded-full border border-white/20 bg-white/10 px-5 text-sm font-semibold text-white transition hover:bg-white/15"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            My Listings
          </Link>
        }
      />

      {isLoading ? (
        <p className="rounded-2xl bg-white px-4 py-3 text-sm text-(--gw-color-muted)">
          Loading listing...
        </p>
      ) : null}

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

      {!isLoading && listing ? (
        <>
          <DashboardSection
            title="Listing preview"
            action={<ListingStatusBadge status={listing.status} />}
          >
            <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
              <div className="space-y-3">
                <div className="aspect-[4/3] overflow-hidden rounded-3xl bg-(--gw-color-border)/45">
                  {resolvedImages[0]?.imageUrl ? (
                    <img
                      src={resolvedImages[0].imageUrl}
                      alt={listing.title}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-sm text-(--gw-color-muted)">
                      No image
                    </div>
                  )}
                </div>
                {resolvedImages.length > 1 ? (
                  <div className="grid grid-cols-4 gap-3">
                    {resolvedImages.slice(1).map((image, index) => (
                      <img
                        key={image.id || image.imageUrl}
                        src={image.imageUrl}
                        alt={`${listing.title} ${index + 2}`}
                        className="aspect-square rounded-2xl border border-(--gw-color-border) object-cover"
                      />
                    ))}
                  </div>
                ) : null}
              </div>

              <div className="space-y-4">
                <DetailRow label="Gold type" value={listing.goldType} />
                <DetailRow label="Purity" value={listing.purity} />
                <DetailRow label="Weight" value={`${listing.weightGrams} grams`} />
                <DetailRow label="Expected price" value={formatMoney(listing.expectedPrice)} />
                <DetailRow label="Condition" value={listing.condition || "Not set"} />
                <DetailRow
                  label="Hallmark"
                  value={listing.hallmarkAvailable ? "Available" : "Not available"}
                />
                <DetailRow
                  label="Bill"
                  value={listing.billAvailable ? "Available" : "Not available"}
                />
                <DetailRow
                  label="Purchase year"
                  value={listing.purchaseYear || "Not set"}
                />
                <div className="flex items-center gap-2 rounded-2xl bg-(--gw-color-cream) px-4 py-3 text-sm text-(--gw-color-muted)">
                  <MapPin className="h-4 w-4" aria-hidden="true" />
                  {listing.city}, {listing.state}
                </div>
                {listing.latitude && listing.longitude ? (
                  <DetailRow
                    label="Coordinates"
                    value={`${listing.latitude}, ${listing.longitude}`}
                  />
                ) : null}
                <DetailRow label="Created" value={formatDate(listing.createdAt)} />
                <DetailRow label="Updated" value={formatDate(listing.updatedAt)} />
              </div>
            </div>

            {listing.description ? (
              <div className="mt-6 rounded-2xl bg-(--gw-color-cream) p-4">
                <h3 className="text-sm font-semibold text-(--gw-color-green)">
                  Description
                </h3>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-(--gw-color-muted)">
                  {listing.description}
                </p>
              </div>
            ) : null}

            <div className="mt-6 flex flex-wrap gap-3">
              {isActive ? (
                <>
                  <button
                    type="button"
                    onClick={() => setIsEditing((current) => !current)}
                    className="inline-flex h-11 items-center gap-2 rounded-full bg-(--gw-color-green) px-5 text-sm font-semibold text-(--gw-color-cream) transition hover:bg-(--gw-color-green-soft)"
                  >
                    <Edit3 className="h-4 w-4" aria-hidden="true" />
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={handleCancelListing}
                    disabled={isCancelling}
                    className="inline-flex h-11 items-center gap-2 rounded-full border border-(--gw-color-copper)/30 bg-(--gw-color-copper)/10 px-5 text-sm font-semibold text-(--gw-color-copper) transition hover:bg-(--gw-color-copper)/15 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    <XCircle className="h-4 w-4" aria-hidden="true" />
                    {isCancelling ? "Cancelling..." : "Cancel listing"}
                  </button>
                </>
              ) : (
                <p className="rounded-2xl bg-(--gw-color-border)/45 px-4 py-3 text-sm font-medium text-(--gw-color-muted)">
                  This listing can no longer be edited.
                </p>
              )}
            </div>
          </DashboardSection>

          {isEditing && isActive ? (
            <DashboardSection title="Edit listing">
              <ListingForm
                mode="edit"
                initialListing={listing}
                existingImages={resolvedImages}
                isSubmitting={isSubmitting}
                submitLabel="Save changes"
                onSubmit={handleUpdateListing}
                onCancel={() => setIsEditing(false)}
              />
            </DashboardSection>
          ) : null}

          <DashboardSection
            title="Private bids"
            description="Bid amounts are visible only to you and the bidding jeweller."
          >
            {bids.length === 0 ? (
              <div className="rounded-2xl bg-(--gw-color-cream) p-4">
                <div className="flex items-center gap-3 text-sm text-(--gw-color-muted)">
                  <Gavel className="h-4 w-4" aria-hidden="true" />
                  No private bids yet.
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {bids.map((bid) => {
                  const canDecide = listing.status === "ACTIVE" && bid.status === "PENDING";

                  return (
                    <div
                      key={bid.id}
                      className="rounded-2xl border border-(--gw-color-border) bg-white p-4"
                    >
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <p className="font-semibold text-(--gw-color-green)">
                            {formatMoney(bid.bidAmount)}
                          </p>
                          <p className="mt-1 text-sm text-(--gw-color-muted)">
                            {bid.jewellerName || "Verified jeweller"} · {bid.status}
                          </p>
                          {bid.message ? (
                            <p className="mt-2 text-sm text-(--gw-color-muted)">
                              {bid.message}
                            </p>
                          ) : null}
                        </div>

                        {canDecide ? (
                          <div className="flex gap-2">
                            <button
                              type="button"
                              disabled={bidActionId === bid.id}
                              onClick={() => handleBidDecision(bid, "accept")}
                              className="h-10 rounded-full bg-(--gw-color-green) px-4 text-sm font-semibold text-(--gw-color-cream) disabled:cursor-not-allowed disabled:opacity-70"
                            >
                              Accept
                            </button>
                            <button
                              type="button"
                              disabled={bidActionId === bid.id}
                              onClick={() => handleBidDecision(bid, "reject")}
                              className="h-10 rounded-full border border-(--gw-color-copper)/30 bg-(--gw-color-copper)/10 px-4 text-sm font-semibold text-(--gw-color-copper) disabled:cursor-not-allowed disabled:opacity-70"
                            >
                              Reject
                            </button>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </DashboardSection>
        </>
      ) : null}
    </div>
  );
}

function DetailRow({ label, value }) {
  return (
    <div className="rounded-2xl border border-(--gw-color-border) bg-white px-4 py-3">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-(--gw-color-muted)">
        {label}
      </p>
      <p className="mt-1 text-sm font-semibold text-(--gw-color-green)">{value}</p>
    </div>
  );
}
