import { Link } from "react-router-dom";

import { ROUTES } from "@/constants/routes";
import { useAuth } from "@/features/auth/context/useAuth";
import DashboardHeader from "@/features/dashboard/components/DashboardHeader";
import DashboardSection from "@/features/dashboard/components/DashboardSection";

export default function SellerListingGatePage() {
  const { user } = useAuth();
  const hasApprovedKyc = user?.kycStatus === "APPROVED";

  return (
    <div className="space-y-6">
      <DashboardHeader
        eyebrow="Seller listings"
        title={hasApprovedKyc ? "Create listing" : "KYC approval required"}
        description={
          hasApprovedKyc
            ? "Listing creation is coming soon."
            : "KYC approval is required before listing gold."
        }
      />

      <DashboardSection
        title={hasApprovedKyc ? "Listing workflow" : "Complete KYC to continue"}
        description={
          hasApprovedKyc
            ? "The listing form will be available when the listings module is implemented."
            : "You can explore the dashboard now. Listing gold unlocks after KYC approval."
        }
      >
        <div className="flex flex-wrap gap-3">
          {!hasApprovedKyc ? (
            <Link
              to={ROUTES.sellerKyc}
              className="inline-flex h-11 items-center justify-center rounded-full bg-(--gw-color-green) px-5 text-sm font-semibold text-(--gw-color-cream) transition hover:bg-(--gw-color-green-soft)"
            >
              Complete KYC
            </Link>
          ) : null}
          <Link
            to={ROUTES.sellerDashboard}
            className="inline-flex h-11 items-center justify-center rounded-full border border-(--gw-color-border) bg-white px-5 text-sm font-semibold text-(--gw-color-green) transition hover:border-(--gw-color-gold)"
          >
            Go to Dashboard
          </Link>
        </div>
      </DashboardSection>
    </div>
  );
}
