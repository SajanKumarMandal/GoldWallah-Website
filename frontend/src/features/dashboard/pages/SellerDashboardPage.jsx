import { BadgeIndianRupee, ClipboardList, Gavel, PackageOpen } from "lucide-react";

import DashboardHeader from "@/features/dashboard/components/DashboardHeader";
import DashboardSection from "@/features/dashboard/components/DashboardSection";
import EmptyState from "@/features/dashboard/components/EmptyState";
import StatCard from "@/features/dashboard/components/StatCard";
import { useAuth } from "@/features/auth/context/useAuth";

const sellerStats = [
  {
    title: "KYC status",
    value: "Approved",
    description: "Your seller account is ready to list verified gold.",
    icon: ClipboardList,
    tone: "gold",
  },
  {
    title: "Active listings",
    value: "0",
    description: "Create your first private gold or jewellery listing.",
    icon: PackageOpen,
    tone: "green",
  },
  {
    title: "Total bids received",
    value: "0",
    description: "Verified jeweller bids will appear here.",
    icon: Gavel,
    tone: "copper",
  },
];

export default function SellerDashboardPage() {
  const { user } = useAuth();
  const firstName = user?.fullName?.split(" ")[0] || "Seller";

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

      <DashboardSection
        title="Recent activity"
        description="Listing updates, verification events, and bid activity will be summarized here."
      >
        <EmptyState
          icon={BadgeIndianRupee}
          title="No seller activity yet"
          description="Once you create a listing, bids and marketplace updates will appear in this activity feed."
        />
      </DashboardSection>
    </div>
  );
}
