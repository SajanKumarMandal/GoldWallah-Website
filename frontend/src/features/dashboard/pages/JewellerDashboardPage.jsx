import {
  BadgeCheck,
  Building2,
  Gavel,
  LockKeyhole,
  MapPinned,
  Search,
  WalletCards,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { ROUTES } from "@/constants/routes";
import { useAuth } from "@/features/auth/context/useAuth";
import DashboardHeader from "@/features/dashboard/components/DashboardHeader";
import DashboardSection from "@/features/dashboard/components/DashboardSection";
import EmptyState from "@/features/dashboard/components/EmptyState";
import StatCard from "@/features/dashboard/components/StatCard";
import {
  getCurrentUser,
  getJewellerDashboard,
} from "@/features/dashboard/services/dashboardService";

export default function JewellerDashboardPage() {
  const { accessToken, user, setAuthUser } = useAuth();
  const [dashboard, setDashboard] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [actionMessage, setActionMessage] = useState("");
  const firstName = user?.fullName?.split(" ")[0] || "Jeweller";

  useEffect(() => {
    let isMounted = true;

    async function loadDashboard() {
      setIsLoading(true);
      setErrorMessage("");

      try {
        const [currentUserResult, dashboardResult] = await Promise.all([
          getCurrentUser(accessToken),
          getJewellerDashboard(accessToken),
        ]);

        if (!isMounted) {
          return;
        }

        if (currentUserResult?.data) {
          setAuthUser(currentUserResult.data);
        }
        setDashboard(dashboardResult?.data || null);
      } catch (error) {
        if (isMounted) {
          setErrorMessage(error.message || "Unable to load jeweller dashboard.");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadDashboard();

    return () => {
      isMounted = false;
    };
  }, [accessToken, setAuthUser]);

  const stats = dashboard?.stats || {};
  const kycStatus = dashboard?.kycStatus || user?.kycStatus || "PENDING";
  const businessVerificationStatus =
    dashboard?.businessVerificationStatus ||
    user?.businessVerificationStatus ||
    "NOT_SUBMITTED";
  const commissionLockStatus =
    dashboard?.commissionLockStatus || user?.commissionLockStatus || "CLEAR";
  const canBid =
    kycStatus === "APPROVED" &&
    businessVerificationStatus === "APPROVED" &&
    commissionLockStatus === "CLEAR";
  const jewellerStats = [
    {
      title: "KYC status",
      value: kycStatus,
      description: "Identity verification state.",
      icon: BadgeCheck,
      tone: "gold",
    },
    {
      title: "Business verification",
      value: businessVerificationStatus,
      description: "Business approval state.",
      icon: Building2,
      tone: "gold",
    },
    {
      title: "Commission lock",
      value: commissionLockStatus,
      description: "Commission dues must be clear before bidding.",
      icon: WalletCards,
      tone: "copper",
    },
    {
      title: "Nearby listings",
      value: String(stats.nearbyListings || 0),
      description: "Matched seller listings will appear by location.",
      icon: MapPinned,
      tone: "green",
    },
    {
      title: "Active bids",
      value: String(stats.activeBids || 0),
      description: "Private bid activity will be tracked here.",
      icon: Gavel,
      tone: "copper",
    },
  ];

  function handleBidAction() {
    if (!canBid) {
      setActionMessage("Verification is required before placing bids.");
      return;
    }

    setActionMessage("Bid placement is coming soon.");
  }

  return (
    <div className="space-y-6">
      <DashboardHeader
        eyebrow="Jeweller workspace"
        title={`Welcome back, ${firstName}.`}
        description="Review verification, discover nearby seller listings, and manage private bidding activity."
        action={
          <Link
            to={ROUTES.jewellerMarketplace}
            className="inline-flex h-11 items-center justify-center rounded-full bg-(--gw-color-gold) px-5 text-sm font-semibold text-(--gw-color-green) transition hover:bg-[#e0ad62]"
          >
            Browse listings
          </Link>
        }
      />

      {businessVerificationStatus !== "APPROVED" ? (
        <div className="rounded-3xl border border-(--gw-color-gold)/45 bg-(--gw-color-gold)/10 p-5 text-(--gw-color-green)">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white">
                <LockKeyhole className="h-5 w-5 text-(--gw-color-gold)" aria-hidden="true" />
              </span>
              <div>
                <h2 className="text-lg font-semibold">
                  Complete business verification to start bidding.
                </h2>
                <p className="mt-1 text-sm text-(--gw-color-muted)">
                  You can access the dashboard while business verification is reviewed.
                </p>
              </div>
            </div>
            <Link
              to={ROUTES.jewellerVerification}
              className="inline-flex h-11 items-center justify-center rounded-full bg-(--gw-color-green) px-5 text-sm font-semibold text-(--gw-color-cream) transition hover:bg-(--gw-color-green-soft)"
            >
              Complete Verification
            </Link>
          </div>
        </div>
      ) : null}

      {commissionLockStatus === "LOCKED" ? (
        <div className="rounded-3xl border border-(--gw-color-copper)/35 bg-(--gw-color-copper)/10 p-5 text-(--gw-color-copper)">
          <div className="flex gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white">
              <WalletCards className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <h2 className="text-lg font-semibold">
                Commission payment pending. Bidding will remain locked until payment is cleared.
              </h2>
              <p className="mt-1 text-sm text-(--gw-color-muted)">
                Payment handling will be available when the commission workflow is built.
              </p>
            </div>
          </div>
        </div>
      ) : null}

      {actionMessage ? (
        <p className="rounded-2xl bg-white px-4 py-3 text-sm font-medium text-(--gw-color-green)">
          {actionMessage}{" "}
          {!canBid ? (
            <Link to={ROUTES.jewellerVerification} className="font-semibold underline">
              Go to verification
            </Link>
          ) : null}
        </p>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {jewellerStats.map((stat) => (
          <StatCard key={stat.title} {...stat} />
        ))}
      </div>

      {isLoading ? (
        <p className="rounded-2xl bg-white/75 px-4 py-3 text-sm text-(--gw-color-muted)">
          Loading jeweller dashboard...
        </p>
      ) : null}

      {errorMessage ? (
        <p className="rounded-2xl bg-(--gw-color-copper)/10 px-4 py-3 text-sm font-medium text-(--gw-color-copper)">
          {errorMessage}
        </p>
      ) : null}

      <DashboardSection
        title="Listed items"
        description="Jewellers can browse seller listings before verification approval; bidding remains locked."
      >
        <div className="rounded-2xl border border-(--gw-color-border) bg-(--gw-color-cream) p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-semibold text-(--gw-color-green)">Marketplace listings</p>
              <p className="mt-1 text-sm text-(--gw-color-muted)">
                Seller listings will appear here when available.
              </p>
            </div>
            <button
              type="button"
              onClick={handleBidAction}
              aria-disabled={!canBid}
              className={`inline-flex h-10 items-center justify-center rounded-full px-4 text-sm font-semibold transition ${
                canBid
                  ? "bg-(--gw-color-green) text-(--gw-color-cream) hover:bg-(--gw-color-green-soft)"
                  : "cursor-not-allowed border border-(--gw-color-border) bg-white text-(--gw-color-muted)"
              }`}
            >
              Place bid
            </button>
          </div>
        </div>
      </DashboardSection>

      <DashboardSection
        title="Recent bidding activity"
        description="Bid updates, seller responses, and listing matches will be shown here."
      >
        {dashboard?.recentActivity?.length ? (
          <div className="space-y-3">
            {dashboard.recentActivity.map((activity) => (
              <div
                key={activity.id}
                className="rounded-2xl border border-(--gw-color-border) bg-(--gw-color-cream) p-4 text-sm text-(--gw-color-muted)"
              >
                {activity.message}
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={Search}
            title="No bidding activity yet"
            description="Once nearby verified listings are available, you can review opportunities and place private bids."
          />
        )}
      </DashboardSection>
    </div>
  );
}
