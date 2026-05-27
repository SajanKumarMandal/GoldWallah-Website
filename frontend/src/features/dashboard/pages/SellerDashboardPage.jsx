import { BadgeIndianRupee, ClipboardList, Gavel, PackageOpen } from "lucide-react";
import { useEffect, useState } from "react";

import DashboardHeader from "@/features/dashboard/components/DashboardHeader";
import DashboardSection from "@/features/dashboard/components/DashboardSection";
import EmptyState from "@/features/dashboard/components/EmptyState";
import StatCard from "@/features/dashboard/components/StatCard";
import { useAuth } from "@/features/auth/context/useAuth";
import {
  getCurrentUser,
  getSellerDashboard,
} from "@/features/dashboard/services/dashboardService";

export default function SellerDashboardPage() {
  const { accessToken, user, setAuthUser } = useAuth();
  const [dashboard, setDashboard] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const firstName = user?.fullName?.split(" ")[0] || "Seller";

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
  const sellerStats = [
    {
      title: "KYC status",
      value: dashboard?.kycStatus || user?.kycStatus || "PENDING",
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
      title: "Total bids received",
      value: String(stats.totalBidsReceived || 0),
      description: "Verified jeweller bids will appear here.",
      icon: Gavel,
      tone: "copper",
    },
  ];

  return (
    <div className="space-y-6">
      <DashboardHeader
        eyebrow="Seller workspace"
        title={`Welcome back, ${firstName}.`}
        description="Track verification, private listings, bids, and seller activity from one focused dashboard."
        action={
          <button
            type="button"
            className="inline-flex h-11 items-center justify-center rounded-full bg-(--gw-color-gold) px-5 text-sm font-semibold text-(--gw-color-green) transition hover:bg-[#e0ad62]"
          >
            New listing
          </button>
        }
      />

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
        title="Recent activity"
        description="Listing updates, verification events, and bid activity will be summarized here."
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
            icon={BadgeIndianRupee}
            title="No seller activity yet"
            description="Once you create a listing, bids and marketplace updates will appear in this activity feed."
          />
        )}
      </DashboardSection>
    </div>
  );
}
