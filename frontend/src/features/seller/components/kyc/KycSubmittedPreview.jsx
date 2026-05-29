import { useMemo, useState } from "react";

import { resolveUploadedImageUrl } from "@/utils/resolveUploadedImageUrl";

function SafeDetail({ label, value }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-[0.16em] text-(--gw-color-muted)">
        {label}
      </dt>
      <dd className="mt-2 text-sm font-semibold text-(--gw-color-green)">
        {value || "Not available"}
      </dd>
    </div>
  );
}

function formatDate(value) {
  if (!value) {
    return "Not available";
  }

  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export default function KycSubmittedPreview({ submission }) {
  const [hasImageError, setHasImageError] = useState(false);
  const selfieImageUrl = useMemo(
    () => resolveUploadedImageUrl(submission?.selfieImageUrl),
    [submission?.selfieImageUrl],
  );

  if (!submission) {
    return null;
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_18rem]">
      <div className="rounded-3xl border border-(--gw-color-border) bg-(--gw-color-cream)/70 p-5">
        <dl className="grid gap-4 sm:grid-cols-2">
          <SafeDetail label="Full name" value={submission.fullName} />
          <SafeDetail label="Mobile number" value={submission.mobileNumber} />
          <SafeDetail
            label="Address as per Aadhaar"
            value={submission.addressAsPerAadhaar}
          />
          <SafeDetail label="Aadhaar last 4" value={submission.aadhaarLast4} />
          <SafeDetail label="PAN last 4" value={submission.panLast4} />
          <SafeDetail
            label="Selfie captured"
            value={formatDate(submission.selfieCapturedAt)}
          />
          <SafeDetail label="Submitted" value={formatDate(submission.createdAt)} />
        </dl>
      </div>
      <div className="rounded-3xl border border-(--gw-color-border) bg-(--gw-color-cream)/70 p-3">
        {selfieImageUrl && !hasImageError ? (
          <img
            src={selfieImageUrl}
            alt="Submitted selfie"
            className="aspect-[4/3] w-full rounded-2xl object-cover"
            onError={() => setHasImageError(true)}
          />
        ) : (
          <div className="flex aspect-[4/3] items-center justify-center rounded-2xl bg-white text-sm text-(--gw-color-muted)">
            Selfie image is unavailable
          </div>
        )}
        <p className="mt-3 text-sm font-semibold text-(--gw-color-green)">Selfie</p>
      </div>
    </div>
  );
}
