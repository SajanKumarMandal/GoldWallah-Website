import {
  BadgeIndianRupee,
  ClipboardList,
  Gavel,
  LockKeyhole,
  MapPinned,
  PackageOpen,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { ROUTES } from "@/constants/routes";
import DashboardHeader from "@/features/dashboard/components/DashboardHeader";
import DashboardSection from "@/features/dashboard/components/DashboardSection";
import EmptyState from "@/features/dashboard/components/EmptyState";
import StatCard from "@/features/dashboard/components/StatCard";
import { useAuth } from "@/features/auth/context/useAuth";
import {
  getCurrentUser,
  getSellerDashboard,
} from "@/features/dashboard/services/dashboardService";
import { requestBrowserLocation } from "@/features/location/utils/browserLocation";
import { getNearbyJewellers } from "@/features/seller/services/sellerGeoService";

export default function SellerDashboardPage() {
  const { accessToken, user, setAuthUser } = useAuth();
  const [dashboard, setDashboard] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCheckingKyc, setIsCheckingKyc] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [actionMessage, setActionMessage] = useState("");
  const [nearbyJewellers, setNearbyJewellers] = useState([]);
  const [nearbyOrigin, setNearbyOrigin] = useState(null);
  const firstName = user?.fullName?.split(" ")[0] || "Seller";
  const navigate = useNavigate();
  const nearbyOriginDescription = nearbyOrigin
    ? nearbyOrigin.city && nearbyOrigin.state
      ? `Matched from ${nearbyOrigin.listingTitle || "your browser location"} in ${nearbyOrigin.city}, ${nearbyOrigin.state}.`
      : "Matched from your browser location."
    : "Share your browser location or create a listing with a city and optional coordinates to discover nearby verified jewellers.";

  useEffect(() => {
    let isMounted = true;

    async function loadDashboard() {
      setIsLoading(true);
      setErrorMessage("");

      try {
        const [currentUserResult, dashboardResult] = await Promise.all([
          getCurrentUser(accessToken),
          getSellerDashboard(accessToken),
        ]);

        if (!isMounted) {
          return;
        }

        if (currentUserResult?.data) {
          setAuthUser(currentUserResult.data);
        }
        setDashboard(dashboardResult?.data || null);
        try {
          let locationQuery = {};

          try {
            const browserLocation = await requestBrowserLocation();
            locationQuery = {
              latitude: browserLocation.latitude,
              longitude: browserLocation.longitude,
            };
          } catch {
            locationQuery = {};
          }

          const nearbyResult = await getNearbyJewellers(accessToken, locationQuery);
          if (isMounted) {
            setNearbyJewellers(nearbyResult?.data || []);
            setNearbyOrigin(nearbyResult?.meta?.origin || null);
          }
        } catch {
          if (isMounted) {
            setNearbyJewellers([]);
            setNearbyOrigin(null);
          }
        }
      } catch (error) {
        if (isMounted) {
          setErrorMessage(error.message || "Unable to load seller dashboard.");
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
  const hasApprovedKyc = kycStatus === "APPROVED";
  const sellerStats = [
    {
      title: "KYC status",
      value: kycStatus,
      description: "Your seller verification state.",
      icon: ClipboardList,
      tone: "gold",
    },
    {
      title: "Active listings",
      value: String(stats.activeListings || 0),
      description: "Create your first private gold or jewellery listing.",
      icon: PackageOpen,
      tone: "green",
    },
    {
      title: "Accepted bids",
      value: String(stats.acceptedBids || 0),
      description: "Accepted private bids become deal records.",
      icon: Gavel,
      tone: "copper",
    },
  ];

  async function handleNewListing() {
    if (!hasApprovedKyc) {
      setIsCheckingKyc(true);
      setActionMessage("");

      try {
        const currentUserResult = await getCurrentUser(accessToken);
        const currentUser = currentUserResult?.data;

        if (currentUser) {
          setAuthUser(currentUser);

          if (currentUser.kycStatus === "APPROVED") {
            navigate(ROUTES.sellerNewListing);
            return;
          }
        }
      } catch {
        setActionMessage("Unable to refresh KYC status. Please try again.");
        return;
      } finally {
        setIsCheckingKyc(false);
      }

      setActionMessage("KYC approval is required before listing gold.");
      return;
    }

    navigate(ROUTES.sellerNewListing);
  }

  return (
    <div className="space-y-6">
      <DashboardHeader
        eyebrow="Seller workspace"
        title={`Welcome back, ${firstName}.`}
        description="Track verification, private listings, bids, and seller activity from one focused dashboard."
        action={
          <button
            type="button"
          onClick={handleNewListing}
          aria-disabled={!hasApprovedKyc || isCheckingKyc}
          disabled={isCheckingKyc}
          className={`inline-flex h-11 items-center justify-center rounded-full px-5 text-sm font-semibold transition ${
              hasApprovedKyc
                ? "bg-(--gw-color-gold) text-(--gw-color-green) hover:bg-[#e0ad62]"
                : "cursor-not-allowed border border-white/20 bg-white/10 text-white"
            }`}
          >
            {isCheckingKyc ? "Checking KYC..." : "New listing"}
          </button>
        }
      />

      {!hasApprovedKyc ? (
        <div className="rounded-3xl border border-(--gw-color-gold)/45 bg-(--gw-color-gold)/10 p-5 text-(--gw-color-green)">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white">
                <LockKeyhole className="h-5 w-5 text-(--gw-color-gold)" aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <h2 className="gw-break-text text-lg font-semibold">Complete KYC to list gold.</h2>
                <p className="mt-1 text-sm text-(--gw-color-muted)">
                  You can explore your dashboard and nearby jewellers while verification is pending.
                </p>
              </div>
            </div>
            <Link
              to={ROUTES.sellerKyc}
              className="inline-flex h-11 items-center justify-center rounded-full bg-(--gw-color-green) px-5 text-sm font-semibold text-(--gw-color-cream) transition hover:bg-(--gw-color-green-soft) sm:w-auto"
            >
              Complete KYC
            </Link>
          </div>
        </div>
      ) : null}

      {actionMessage ? (
        <p className="rounded-2xl bg-white px-4 py-3 text-sm font-medium text-(--gw-color-green)">
          {actionMessage}{" "}
          {!hasApprovedKyc ? (
            <Link to={ROUTES.sellerKyc} className="font-semibold underline">
              Complete KYC
            </Link>
          ) : null}
        </p>
      ) : null}

      <div className="grid gap-4 md:grid-cols-3">
        {sellerStats.map((stat) => (
          <StatCard key={stat.title} {...stat} />
        ))}
      </div>

      {isLoading ? (
        <p className="rounded-2xl bg-white/75 px-4 py-3 text-sm text-(--gw-color-muted)">
          Loading seller dashboard...
        </p>
      ) : null}

      {errorMessage ? (
        <p className="rounded-2xl bg-(--gw-color-copper)/10 px-4 py-3 text-sm font-medium text-(--gw-color-copper)">
          {errorMessage}
        </p>
      ) : null}

      <DashboardSection
        title="Nearest jewellers"
        description={nearbyOriginDescription}
      >
        {nearbyJewellers.length > 0 ? (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {nearbyJewellers.map((jeweller) => (
              <article
                key={jeweller.jewellerId}
                className="rounded-2xl border border-(--gw-color-border) bg-(--gw-color-cream) p-4"
              >
                <p className="gw-break-text font-semibold text-(--gw-color-green)">
                  {jeweller.shopName}
                </p>
                <p className="gw-break-text mt-1 text-sm text-(--gw-color-muted)">
                  {jeweller.city}, {jeweller.state}
                </p>
                <p className="mt-3 text-xs font-semibold uppercase tracking-[0.14em] text-(--gw-color-muted)">
                  {jeweller.distanceKm === null || jeweller.distanceKm === undefined
                    ? jeweller.matchMode
                    : `${Number(jeweller.distanceKm).toFixed(1)} km away`}
                </p>
              </article>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={MapPinned}
            title="Nearest jewellers will appear here"
            description="Share your browser location or create a listing so approved jewellers near you can be ranked here."
          />
        )}
      </DashboardSection>

      <DashboardSection
        title="Recent activity"
        description="Listing updates, verification events, and bid activity will be summarized here."
        action={
          <Link
            to={ROUTES.sellerListings}
            className="inline-flex h-10 items-center justify-center rounded-full border border-(--gw-color-border) bg-white px-4 text-sm font-semibold text-(--gw-color-green) transition hover:border-(--gw-color-gold)"
          >
            My Listings
          </Link>
        }
      >
        {dashboard?.recentActivity?.length ? (
          <div className="space-y-3">
            {dashboard.recentActivity.map((activity) => (
              <div
                key={activity.id}
                className="gw-break-text rounded-2xl border border-(--gw-color-border) bg-(--gw-color-cream) p-4 text-sm text-(--gw-color-muted)"
              >
                {activity.message}
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={BadgeIndianRupee}
            title="No seller activity yet"
            description="Once you create a listing, bids and marketplace updates will appear in this activity feed."
          />
        )}
      </DashboardSection>
    </div>
  );
}
