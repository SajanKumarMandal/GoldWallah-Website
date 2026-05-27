import { BadgeCheck, Gavel, MapPinned, Search } from "lucide-react";
import { useEffect, useState } from "react";

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
  const verificationValue =
    dashboard?.kycStatus === "APPROVED" &&
    dashboard?.businessVerificationStatus === "APPROVED"
      ? "Approved"
      : "Pending";
  const jewellerStats = [
    {
      title: "Verification status",
      value: verificationValue,
      description: "KYC and business verification state.",
      icon: BadgeCheck,
      tone: "gold",
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

  return (
    <div className="space-y-6">
      <DashboardHeader
        eyebrow="Jeweller workspace"
        title={`Welcome back, ${firstName}.`}
        description="Review verification, discover nearby seller listings, and manage private bidding activity."
        action={
          <button
            type="button"
            className="inline-flex h-11 items-center justify-center rounded-full bg-(--gw-color-gold) px-5 text-sm font-semibold text-(--gw-color-green) transition hover:bg-[#e0ad62]"
          >
            Browse listings
          </button>
        }
      />

      <div className="grid gap-4 md:grid-cols-3">
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
