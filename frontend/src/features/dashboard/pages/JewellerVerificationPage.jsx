import { Building2 } from "lucide-react";

import DashboardHeader from "@/features/dashboard/components/DashboardHeader";
import DashboardSection from "@/features/dashboard/components/DashboardSection";

export default function JewellerVerificationPage() {
  return (
    <div className="space-y-6">
      <DashboardHeader
        eyebrow="Jeweller verification"
        title="Complete KYC and business verification before bidding."
        description="GoldWallah verifies both identity and jewellery business credentials before private bidding access is enabled."
      />

      <DashboardSection
        title="Verification placeholder"
        description="Business documents, GST details, store checks, and approval status will be connected here."
      >
        <div className="rounded-3xl border border-dashed border-(--gw-color-border) bg-(--gw-color-cream)/75 p-8 text-center">
          <Building2
            className="mx-auto h-10 w-10 text-(--gw-color-gold)"
            aria-hidden="true"
          />
          <h2 className="mt-4 text-xl font-semibold text-(--gw-color-green)">
            Business verification workflow coming next
          </h2>
          <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-(--gw-color-muted)">
            This page is ready for KYC, business verification forms, and review timeline
            states.
          </p>
        </div>
      </DashboardSection>
    </div>
  );
}
