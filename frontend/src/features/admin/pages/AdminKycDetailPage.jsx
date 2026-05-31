import { ArrowLeft } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useOutletContext, useParams } from "react-router-dom";

import { ROUTES } from "@/constants/routes";
import DashboardHeader from "@/features/dashboard/components/DashboardHeader";
import DashboardSection from "@/features/dashboard/components/DashboardSection";
import {
  approveSellerKyc,
  getSellerKycSubmission,
  rejectSellerKyc,
} from "@/features/admin/services/adminKycService";
import { resolveUploadedImageUrl } from "@/utils/resolveUploadedImageUrl";

// Admin KYC detail screen. This page can show full identity details; backend
// access is protected and audit logged whenever the detail endpoint is opened.
function formatDate(value) {
  if (!value) {
    return "Not available";
  }

  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function DetailItem({ label, value }) {
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

export default function AdminKycDetailPage() {
  const { kycId } = useParams();
  const { accessToken } = useOutletContext();
  const [submission, setSubmission] = useState(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isMutating, setIsMutating] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [hasImageError, setHasImageError] = useState(false);
  const selfieImageUrl = useMemo(
    () => resolveUploadedImageUrl(submission?.selfieImageUrl),
    [submission?.selfieImageUrl],
  );

  useEffect(() => {
    let isMounted = true;

    async function loadSubmission() {
      setIsLoading(true);
      setErrorMessage("");

      try {
        const result = await getSellerKycSubmission({ accessToken, kycId });

        if (isMounted) {
          setSubmission(result?.data || null);
          setRejectionReason(result?.data?.rejectionReason || "");
        }
      } catch (error) {
        if (isMounted) {
          setErrorMessage(error.message || "Unable to load KYC submission.");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadSubmission();

    return () => {
      isMounted = false;
    };
  }, [accessToken, kycId]);

  const canReview = submission?.status === "PENDING";

  async function handleApprove() {
    setIsMutating(true);
    setErrorMessage("");
    setStatusMessage("");

    try {
      const result = await approveSellerKyc({ accessToken, kycId });
      setSubmission((currentSubmission) => ({
        ...currentSubmission,
        ...result?.data?.submission,
      }));
      setStatusMessage("Seller KYC approved.");
    } catch (error) {
      setErrorMessage(error.message || "Unable to approve seller KYC.");
    } finally {
      setIsMutating(false);
    }
  }

  async function handleReject() {
    const trimmedReason = rejectionReason.trim();

    if (!trimmedReason) {
      setErrorMessage("Rejection reason is required.");
      return;
    }

    setIsMutating(true);
    setErrorMessage("");
    setStatusMessage("");

    try {
      const result = await rejectSellerKyc({
        accessToken,
        kycId,
        rejectionReason: trimmedReason,
      });
      setSubmission((currentSubmission) => ({
        ...currentSubmission,
        ...result?.data?.submission,
      }));
      setStatusMessage("Seller KYC rejected.");
    } catch (error) {
      setErrorMessage(error.message || "Unable to reject seller KYC.");
    } finally {
      setIsMutating(false);
    }
  }

  return (
    <div className="space-y-6">
      <DashboardHeader
        eyebrow="Admin review"
        title="Seller KYC identity detail"
        description="Full Aadhaar and PAN are shown only on this detail screen for authorized admin verification."
        action={
          <Link
            to={ROUTES.adminKyc}
            className="inline-flex h-11 items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 text-sm font-semibold text-white transition hover:bg-white/16"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Back to queue
          </Link>
        }
      />

      {errorMessage ? (
        <p className="rounded-2xl bg-(--gw-color-copper)/10 px-4 py-3 text-sm font-medium text-(--gw-color-copper)">
          {errorMessage}
        </p>
      ) : null}

      {statusMessage ? (
        <p className="rounded-2xl bg-(--gw-color-gold)/12 px-4 py-3 text-sm font-medium text-(--gw-color-green)">
          {statusMessage}
        </p>
      ) : null}

      {isLoading ? (
        <p className="rounded-2xl bg-(--gw-color-cream) px-4 py-3 text-sm text-(--gw-color-muted)">
          Loading KYC submission...
        </p>
      ) : null}

      {submission ? (
        <div className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(18rem,22rem)]">
          <DashboardSection
            title="Submitted identity"
            description="Exact identity details submitted by the seller."
          >
            <dl className="grid gap-5 md:grid-cols-2">
              <DetailItem label="Full name" value={submission.fullName} />
              <DetailItem label="Mobile number" value={submission.mobileNumber} />
              <DetailItem
                label="Address as per Aadhaar"
                value={submission.addressAsPerAadhaar}
              />
              <DetailItem label="Full Aadhaar number" value={submission.aadhaarNumber} />
              <DetailItem label="Full PAN number" value={submission.panNumber} />
              <DetailItem label="Selfie captured" value={formatDate(submission.selfieCapturedAt)} />
              <DetailItem label="Status" value={submission.status} />
              <DetailItem label="Submitted" value={formatDate(submission.createdAt)} />
              {submission.rejectionReason ? (
                <DetailItem
                  label="Rejection reason"
                  value={submission.rejectionReason}
                />
              ) : null}
            </dl>
          </DashboardSection>

          <DashboardSection title="Selfie" description="Camera-captured selfie preview.">
            {selfieImageUrl && !hasImageError ? (
              <img
                src={selfieImageUrl}
                alt="Seller KYC selfie"
                loading="lazy"
                decoding="async"
                className="aspect-[4/3] w-full rounded-2xl object-cover"
                onError={() => setHasImageError(true)}
              />
            ) : (
              <div className="flex aspect-[4/3] items-center justify-center rounded-2xl bg-(--gw-color-cream) text-sm text-(--gw-color-muted)">
                Selfie image is unavailable
              </div>
            )}
          </DashboardSection>
        </div>
      ) : null}

      {submission ? (
        <DashboardSection
          title="Review action"
          description="Approve or reject only pending KYC submissions."
        >
          <textarea
            value={rejectionReason}
            disabled={!canReview || isMutating}
            rows={4}
            onChange={(event) => setRejectionReason(event.target.value)}
            placeholder="Required when rejecting"
            className="w-full resize-none rounded-2xl border border-(--gw-color-border) bg-white px-4 py-3 text-sm text-(--gw-color-green) outline-none transition placeholder:text-(--gw-color-muted)/55 focus:border-(--gw-color-gold) focus:ring-4 focus:ring-(--gw-color-gold)/15 disabled:cursor-not-allowed disabled:bg-(--gw-color-border)/35"
          />
          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <button
              type="button"
              disabled={!canReview || isMutating}
              onClick={handleApprove}
              className="inline-flex h-11 items-center justify-center rounded-full bg-(--gw-color-green) px-5 text-sm font-semibold text-(--gw-color-cream) transition hover:bg-(--gw-color-green-soft) disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
            >
              Approve
            </button>
            <button
              type="button"
              disabled={!canReview || isMutating}
              onClick={handleReject}
              className="inline-flex h-11 items-center justify-center rounded-full bg-(--gw-color-copper) px-5 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
            >
              Reject
            </button>
          </div>
        </DashboardSection>
      ) : null}
    </div>
  );
}
