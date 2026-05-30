import { AlertCircle, CheckCircle2, Clock3, Store } from "lucide-react";

import { JEWELLER_VERIFICATION_STATUS } from "@/features/jeweller/constants/jewellerVerificationStatus";

const statusContent = {
  [JEWELLER_VERIFICATION_STATUS.notSubmitted]: {
    title: "Complete business verification",
    description: "Submit shop, identity, location, and image details for review.",
    icon: Store,
    tone: "border-(--gw-color-border) bg-white text-(--gw-color-muted)",
  },
  [JEWELLER_VERIFICATION_STATUS.pending]: {
    title: "Your business verification is under review.",
    description: "You can use the dashboard while bid access remains locked.",
    icon: Clock3,
    tone: "border-(--gw-color-gold)/45 bg-(--gw-color-gold)/10 text-(--gw-color-green)",
  },
  [JEWELLER_VERIFICATION_STATUS.approved]: {
    title: "Your business verification is approved.",
    description:
      "You can now bid once KYC is approved and commission status is clear.",
    icon: CheckCircle2,
    tone: "border-(--gw-color-green)/25 bg-(--gw-color-green)/10 text-(--gw-color-green)",
  },
  [JEWELLER_VERIFICATION_STATUS.rejected]: {
    title: "Business verification resubmission required.",
    description: "Review the rejection reason and submit corrected details.",
    icon: AlertCircle,
    tone: "border-(--gw-color-copper)/35 bg-(--gw-color-copper)/10 text-(--gw-color-copper)",
  },
};

export default function JewellerVerificationStatusCard({ status }) {
  const content =
    statusContent[status] ||
    statusContent[JEWELLER_VERIFICATION_STATUS.notSubmitted];
  const StatusIcon = content.icon;

  return (
    <div className={`rounded-3xl border p-5 shadow-sm ${content.tone}`}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/75">
          <StatusIcon className="h-6 w-6" aria-hidden="true" />
        </span>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em]">
            Business verification
          </p>
          <h2 className="mt-2 text-2xl font-semibold">{content.title}</h2>
          <p className="mt-2 text-sm leading-6 opacity-80">{content.description}</p>
        </div>
      </div>
    </div>
  );
}
