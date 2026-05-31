import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { ROUTES } from "@/constants/routes";
import { useAuth } from "@/features/auth/context/useAuth";
import DashboardHeader from "@/features/dashboard/components/DashboardHeader";
import DashboardSection from "@/features/dashboard/components/DashboardSection";
import { getCurrentUser } from "@/features/dashboard/services/dashboardService";
import ListingForm from "@/features/seller/components/listings/ListingForm";
import { createListing } from "@/features/seller/services/sellerListingService";

export default function CreateListingPage() {
  const { accessToken, user, setAuthUser } = useAuth();
  const navigate = useNavigate();
  const [isCheckingKyc, setIsCheckingKyc] = useState(user?.kycStatus !== "APPROVED");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const hasApprovedKyc = user?.kycStatus === "APPROVED";

  useEffect(() => {
    let isMounted = true;

    async function refreshKycGate() {
      if (!accessToken || hasApprovedKyc) {
        setIsCheckingKyc(false);
        return;
      }

      setIsCheckingKyc(true);

      try {
        const result = await getCurrentUser(accessToken);

        if (isMounted && result?.data) {
          setAuthUser(result.data);
        }
      } catch {
        if (isMounted) {
          setErrorMessage("Unable to refresh KYC status. Please try again.");
        }
      } finally {
        if (isMounted) {
          setIsCheckingKyc(false);
        }
      }
    }

    refreshKycGate();

    return () => {
      isMounted = false;
    };
  }, [accessToken, hasApprovedKyc, setAuthUser]);

  async function handleSubmit(formData) {
    setIsSubmitting(true);
    setErrorMessage("");

    try {
      const result = await createListing(formData, accessToken);
      const listingId = result?.data?.id;

      navigate(
        listingId
          ? ROUTES.sellerListingDetail.replace(":listingId", listingId)
          : ROUTES.sellerListings,
      );
    } catch (error) {
      setErrorMessage(error.message || "Unable to create listing.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!hasApprovedKyc) {
    return (
      <div className="space-y-6">
        <DashboardHeader
          eyebrow="Seller listings"
          title="KYC approval required"
          description="You can explore the dashboard now. Creating gold listings unlocks after seller KYC approval."
        />
        <DashboardSection title="Complete KYC to create listings">
          {isCheckingKyc ? (
            <p className="mb-4 rounded-2xl bg-(--gw-color-cream) px-4 py-3 text-sm text-(--gw-color-muted)">
              Checking latest KYC approval status...
            </p>
          ) : null}
          {errorMessage ? (
            <p className="mb-4 rounded-2xl bg-(--gw-color-copper)/10 px-4 py-3 text-sm font-medium text-(--gw-color-copper)">
              {errorMessage}
            </p>
          ) : null}
          <div className="flex flex-wrap gap-3">
            <Link
              to={ROUTES.sellerKyc}
              className="inline-flex h-11 items-center justify-center rounded-full bg-(--gw-color-green) px-5 text-sm font-semibold text-(--gw-color-cream) transition hover:bg-(--gw-color-green-soft)"
            >
              Complete KYC
            </Link>
            <Link
              to={ROUTES.sellerListings}
              className="inline-flex h-11 items-center justify-center rounded-full border border-(--gw-color-border) bg-white px-5 text-sm font-semibold text-(--gw-color-green) transition hover:border-(--gw-color-gold)"
            >
              My Listings
            </Link>
          </div>
        </DashboardSection>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <DashboardHeader
        eyebrow="Seller listings"
        title="Create gold listing"
        description="Add item details, location, and up to five clear images for verified jewellers to evaluate later."
      />

      {errorMessage ? (
        <p className="rounded-2xl bg-(--gw-color-copper)/10 px-4 py-3 text-sm font-medium text-(--gw-color-copper)">
          {errorMessage}{" "}
          {errorMessage.toLowerCase().includes("kyc") ? (
            <Link to={ROUTES.sellerKyc} className="font-semibold underline">
              Complete KYC
            </Link>
          ) : null}
        </p>
      ) : null}

      <DashboardSection title="Listing details">
        <ListingForm
          mode="create"
          isSubmitting={isSubmitting}
          submitLabel="Create listing"
          onSubmit={handleSubmit}
        />
      </DashboardSection>
    </div>
  );
}
