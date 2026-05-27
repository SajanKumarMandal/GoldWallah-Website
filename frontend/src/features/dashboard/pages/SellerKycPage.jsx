import { ShieldCheck } from "lucide-react";

import DashboardHeader from "@/features/dashboard/components/DashboardHeader";
import DashboardSection from "@/features/dashboard/components/DashboardSection";

export default function SellerKycPage() {
  return (
    <div className="space-y-6">
      <DashboardHeader
        eyebrow="Seller verification"
        title="Complete KYC before listing gold."
        description="GoldWallah requires seller KYC approval before any gold or jewellery listing can go live."
      />

      <DashboardSection
        title="KYC placeholder"
        description="Document upload, identity checks, and approval status will be connected here."
      >
        <div className="rounded-3xl border border-dashed border-(--gw-color-border) bg-(--gw-color-cream)/75 p-8 text-center">
          <ShieldCheck
            className="mx-auto h-10 w-10 text-(--gw-color-gold)"
            aria-hidden="true"
          />
          <h2 className="mt-4 text-xl font-semibold text-(--gw-color-green)">
            KYC workflow coming next
          </h2>
          <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-(--gw-color-muted)">
            This page is ready for identity verification forms, upload progress, and
            review timeline states.
          </p>
        </div>
      </DashboardSection>
    </div>
  );
}
