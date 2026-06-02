import { AlertCircle, CheckCircle2, Clock3, FileCheck2 } from "lucide-react";

import { KYC_STATUS } from "@/features/seller/constants/kycStatus";

const statusContent = {
  [KYC_STATUS.notSubmitted]: {
    title: "Complete seller KYC",
    description: "Submit your details and camera-captured selfie for review.",
    icon: FileCheck2,
    tone: "border-(--gw-color-border) bg-white text-(--gw-color-muted)",
  },
  [KYC_STATUS.pending]: {
    title: "Your KYC is under review.",
    description:
      "You can explore the dashboard, but listing gold will be enabled after approval.",
    icon: Clock3,
    tone: "border-(--gw-color-gold)/45 bg-(--gw-color-gold)/10 text-(--gw-color-green)",
  },
  [KYC_STATUS.approved]: {
    title: "Your KYC is approved. You can now list gold.",
    description: "Seller listing access is enabled for your account.",
    icon: CheckCircle2,
    tone: "border-(--gw-color-green)/25 bg-(--gw-color-green)/10 text-(--gw-color-green)",
  },
  [KYC_STATUS.rejected]: {
    title: "KYC resubmission required.",
    description: "Review the rejection reason and submit updated details.",
    icon: AlertCircle,
    tone: "border-(--gw-color-copper)/35 bg-(--gw-color-copper)/10 text-(--gw-color-copper)",
  },
};

export default function KycStatusCard({
  status,
  roleLabel = "Seller",
  pendingDescription,
  approvedTitle,
  approvedDescription,
}) {
  const content = statusContent[status] || statusContent[KYC_STATUS.notSubmitted];
  const StatusIcon = content.icon;
  const title =
    status === KYC_STATUS.notSubmitted
      ? `Complete ${roleLabel.toLowerCase()} KYC`
      : status === KYC_STATUS.approved && approvedTitle
        ? approvedTitle
      : content.title;
  const description =
    status === KYC_STATUS.pending
      ? pendingDescription || content.description
      : status === KYC_STATUS.approved
        ? approvedDescription || content.description
        : content.description;

  return (
    <div className={`rounded-3xl border p-5 shadow-sm ${content.tone}`}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/75">
          <StatusIcon className="h-6 w-6" aria-hidden="true" />
        </span>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em]">
            KYC status
          </p>
          <h2 className="mt-2 text-2xl font-semibold">{title}</h2>
          <p className="mt-2 text-sm leading-6 opacity-80">{description}</p>
        </div>
      </div>
    </div>
  );
}
