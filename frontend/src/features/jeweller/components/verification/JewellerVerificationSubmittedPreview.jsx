import { useMemo, useState } from "react";

import { resolveUploadedImageUrl } from "@/utils/resolveUploadedImageUrl";

function formatDate(value) {
  if (!value) {
    return "Not available";
  }

  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function SafeDetail({ label, value }) {
  return (
    <div className="min-w-0">
      <dt className="gw-break-text text-xs font-semibold uppercase tracking-[0.14em] text-(--gw-color-muted) sm:tracking-[0.16em]">
        {label}
      </dt>
      <dd className="gw-break-text mt-2 text-sm font-semibold text-(--gw-color-green)">
        {value || "Not available"}
      </dd>
    </div>
  );
}

export default function JewellerVerificationSubmittedPreview({ verification }) {
  if (!verification) {
    return null;
  }

  return (
    <div className="space-y-4">
      <div className="rounded-3xl border border-(--gw-color-border) bg-(--gw-color-cream)/70 p-5">
        <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <SafeDetail label="Shop name" value={verification.shopName} />
          <SafeDetail label="Owner name" value={verification.ownerName} />
          <SafeDetail label="Business mobile" value={verification.businessMobile} />
          <SafeDetail label="Business email" value={verification.businessEmail} />
          <SafeDetail
            label="Business address"
            value={verification.businessAddress}
          />
          <SafeDetail label="City" value={verification.city} />
          <SafeDetail label="State" value={verification.state} />
          <SafeDetail label="Pincode" value={verification.pincode} />
          <SafeDetail label="Latitude" value={verification.latitude} />
          <SafeDetail label="Longitude" value={verification.longitude} />
          <SafeDetail label="Business type" value={verification.businessType} />
          <SafeDetail
            label="Opening time"
            value={verification.shopOpeningTime}
          />
          <SafeDetail
            label="Closing time"
            value={verification.shopClosingTime}
          />
          <SafeDetail
            label="Years in business"
            value={verification.yearsInBusiness}
          />
          <SafeDetail label="GST last 4" value={verification.gstLast4} />
          <SafeDetail
            label="Shop license last 4"
            value={verification.shopLicenseLast4}
          />
          <SafeDetail label="Submitted" value={formatDate(verification.createdAt)} />
        </dl>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <PreviewImage
          label="Shop front"
          imageUrl={verification.shopFrontImageUrl}
        />
        <PreviewImage
          label="GST certificate"
          imageUrl={verification.gstCertificateImageUrl}
        />
        <PreviewImage
          label="Shop license"
          imageUrl={verification.shopLicenseImageUrl}
        />
      </div>
    </div>
  );
}

function PreviewImage({ label, imageUrl }) {
  const [hasError, setHasError] = useState(false);
  const resolvedUrl = useMemo(() => resolveUploadedImageUrl(imageUrl), [imageUrl]);

  return (
    <div className="min-w-0 rounded-3xl border border-(--gw-color-border) bg-(--gw-color-cream)/70 p-3">
      {resolvedUrl && !hasError ? (
        <img
          src={resolvedUrl}
          alt={label}
          loading="lazy"
          decoding="async"
          className="aspect-[4/3] w-full rounded-2xl object-cover"
          onError={() => setHasError(true)}
        />
      ) : (
        <div className="flex aspect-[4/3] items-center justify-center rounded-2xl bg-white px-4 text-center text-sm text-(--gw-color-muted)">
          {label} image is unavailable
        </div>
      )}
      <p className="mt-3 text-sm font-semibold text-(--gw-color-green)">
        {label}
      </p>
    </div>
  );
}
