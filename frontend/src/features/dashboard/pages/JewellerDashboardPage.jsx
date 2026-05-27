import { BadgeCheck, Gavel, MapPinned, Search } from "lucide-react";

import { useAuth } from "@/features/auth/context/useAuth";
import DashboardHeader from "@/features/dashboard/components/DashboardHeader";
import DashboardSection from "@/features/dashboard/components/DashboardSection";
import EmptyState from "@/features/dashboard/components/EmptyState";
import StatCard from "@/features/dashboard/components/StatCard";

const jewellerStats = [
  {
    title: "Verification status",
    value: "Approved",
    description: "KYC and business verification are complete.",
    icon: BadgeCheck,
    tone: "gold",
  },
  {
    title: "Nearby listings",
    value: "0",
    description: "Matched seller listings will appear by location.",
    icon: MapPinned,
    tone: "green",
  },
  {
    title: "Active bids",
    value: "0",
    description: "Private bid activity will be tracked here.",
    icon: Gavel,
    tone: "copper",
  },
];

export default function JewellerDashboardPage() {
  const { user } = useAuth();
  const firstName = user?.fullName?.split(" ")[0] || "Jeweller";

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

      <DashboardSection
        title="Recent bidding activity"
        description="Bid updates, seller responses, and listing matches will be shown here."
      >
        <EmptyState
          icon={Search}
          title="No bidding activity yet"
          description="Once nearby verified listings are available, you can review opportunities and place private bids."
        />
      </DashboardSection>
    </div>
  );
}
