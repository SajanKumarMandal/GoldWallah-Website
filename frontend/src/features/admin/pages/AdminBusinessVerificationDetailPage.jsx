import {
  ArrowLeft,
  BadgeCheck,
  Building2,
  CalendarClock,
  FileImage,
  MapPin,
  XCircle,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useOutletContext, useParams } from "react-router-dom";

import { ROUTES } from "@/constants/routes";
import { clearAdminSession } from "@/features/admin/auth/utils/adminTokenStorage";
import {
  approveBusinessVerification,
  getBusinessVerification,
  rejectBusinessVerification,
} from "@/features/admin/services/adminBusinessVerificationService";
import DashboardHeader from "@/features/dashboard/components/DashboardHeader";
import DashboardSection from "@/features/dashboard/components/DashboardSection";
import { formatDateTime } from "@/utils/formatDate";

function normalizeVerification(result) {
  return result?.data?.verification || result?.data || null;
}

function maskValue(value, visible = 4) {
  if (!value || value.length <= visible) {
    return value || "Not available";
  }

  return `${"*".repeat(Math.max(value.length - visible, 4))}${value.slice(-visible)}`;
}

export default function AdminBusinessVerificationDetailPage() {
  const { accessToken } = useOutletContext();
  const { verificationId } = useParams();
  const navigate = useNavigate();
  const [verification, setVerification] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isApproving, setIsApproving] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);
  const [reviewNotes, setReviewNotes] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [statusMessage, setStatusMessage] = useState("");

  const canReview = verification?.status === "PENDING";
  const reviewedStatus = useMemo(() => {
    if (!verification) {
      return "";
    }

    if (verification.status === "PENDING") {
      return "Awaiting admin decision";
    }

    return `${verification.status} on ${formatDateTime(
      verification.reviewedAt || verification.updatedAt,
    )}`;
  }, [verification]);

  async function loadVerification() {
    setIsLoading(true);
    setErrorMessage("");

    try {
      const result = await getBusinessVerification({
        accessToken,
        verificationId,
      });
      setVerification(normalizeVerification(result));
    } catch (error) {
      if (error.status === 401) {
        clearAdminSession();
        navigate(ROUTES.adminLogin, { replace: true });
        return;
      }

      setErrorMessage(error.message || "Unable to load business verification.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    let isMounted = true;

    async function load() {
      setIsLoading(true);
      setErrorMessage("");

      try {
        const result = await getBusinessVerification({
          accessToken,
          verificationId,
        });

        if (isMounted) {
          setVerification(normalizeVerification(result));
        }
      } catch (error) {
        if (error.status === 401) {
          clearAdminSession();
          navigate(ROUTES.adminLogin, { replace: true });
          return;
        }

        if (isMounted) {
          setErrorMessage(error.message || "Unable to load business verification.");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    load();

    return () => {
      isMounted = false;
    };
  }, [accessToken, navigate, verificationId]);

  async function handleApprove() {
    const notes = reviewNotes.trim();

    if (notes.length < 5) {
      setErrorMessage("Review notes must be at least 5 characters.");
      return;
    }

    setIsApproving(true);
    setErrorMessage("");
    setStatusMessage("");

    try {
      const result = await approveBusinessVerification({
        accessToken,
        verificationId,
        reviewNotes: notes,
      });
      setVerification(normalizeVerification(result));
      setReviewNotes("");
      setStatusMessage("Business verification approved. The jeweller can now access bidding if all other locks are clear.");
    } catch (error) {
      if (error.status === 401) {
        clearAdminSession();
        navigate(ROUTES.adminLogin, { replace: true });
        return;
      }

      setErrorMessage(error.message || "Unable to approve business verification.");
      await loadVerification();
    } finally {
      setIsApproving(false);
    }
  }

  async function handleReject(event) {
    event.preventDefault();
    const reason = rejectionReason.trim();
    const notes = reviewNotes.trim();

    if (reason.length < 5) {
      setErrorMessage("Rejection reason must be at least 5 characters.");
      return;
    }

    setIsRejecting(true);
    setErrorMessage("");
    setStatusMessage("");

    try {
      const result = await rejectBusinessVerification({
        accessToken,
        verificationId,
        rejectionReason: reason,
        reviewNotes: notes || undefined,
      });
      setVerification(normalizeVerification(result));
      setRejectionReason("");
      setReviewNotes("");
      setStatusMessage("Business verification rejected. The jeweller can correct and resubmit.");
    } catch (error) {
      if (error.status === 401) {
        clearAdminSession();
        navigate(ROUTES.adminLogin, { replace: true });
        return;
      }

      setErrorMessage(error.message || "Unable to reject business verification.");
      await loadVerification();
    } finally {
      setIsRejecting(false);
    }
  }

  return (
    <div className="space-y-6">
      <DashboardHeader
        eyebrow="Admin business review"
        title={verification?.shopName || "Business verification detail"}
        description="Full business identity values and private documents are shown only in this audited admin review screen."
        action={
          <Link
            to={ROUTES.adminBusinessVerifications}
            className="inline-flex h-11 items-center gap-2 rounded-full border border-white/20 bg-white/10 px-5 text-sm font-semibold text-white transition hover:bg-white/15"
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
        <p className="rounded-2xl bg-white px-4 py-3 text-sm text-(--gw-color-muted)">
          Loading business verification...
        </p>
      ) : null}

      {!isLoading && verification ? (
        <>
          <DashboardSection
            title="Review summary"
            description="Confirm business identity, documents, and location before taking action."
            action={<StatusPill status={verification.status} />}
          >
            <div className="grid gap-4 lg:grid-cols-3">
              <InfoCard
                icon={Building2}
                label="Shop"
                value={verification.shopName}
                detail={verification.ownerName}
              />
              <InfoCard
                icon={MapPin}
                label="Location"
                value={[verification.city, verification.state].filter(Boolean).join(", ")}
                detail={verification.pincode}
              />
              <InfoCard
                icon={CalendarClock}
                label="Submitted"
                value={formatDateTime(verification.createdAt)}
                detail={reviewedStatus}
              />
            </div>
          </DashboardSection>

          <DashboardSection title="Business details">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              <DetailRow label="Shop name" value={verification.shopName} />
              <DetailRow label="Owner name" value={verification.ownerName} />
              <DetailRow label="Business mobile" value={verification.businessMobile} />
              <DetailRow label="Business email" value={verification.businessEmail} />
              <DetailRow label="Business type" value={verification.businessType} />
              <DetailRow label="Years in business" value={verification.yearsInBusiness} />
              <DetailRow label="Opening time" value={verification.shopOpeningTime} />
              <DetailRow label="Closing time" value={verification.shopClosingTime} />
              <DetailRow label="Latitude" value={verification.latitude} />
              <DetailRow label="Longitude" value={verification.longitude} />
              <DetailRow label="GST number" value={verification.gstNumber || maskValue(verification.gstLast4)} />
              <DetailRow
                label="Shop license number"
                value={verification.shopLicenseNumber || maskValue(verification.shopLicenseLast4)}
              />
            </div>
            <div className="mt-3 rounded-2xl border border-(--gw-color-border) bg-white px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-(--gw-color-muted)">
                Business address
              </p>
              <p className="gw-break-text mt-2 whitespace-pre-wrap text-sm font-semibold leading-6 text-(--gw-color-green)">
                {verification.businessAddress || "Not available"}
              </p>
            </div>
            {verification.rejectionReason ? (
              <div className="mt-3 rounded-2xl border border-(--gw-color-copper)/30 bg-(--gw-color-copper)/10 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-(--gw-color-copper)">
                  Rejection reason
                </p>
                <p className="gw-break-text mt-2 whitespace-pre-wrap text-sm font-semibold leading-6 text-(--gw-color-copper)">
                  {verification.rejectionReason}
                </p>
              </div>
            ) : null}
          </DashboardSection>

          <DashboardSection
            title="Private business documents"
            description="Document previews use short-lived private URLs and admin access is audited."
          >
            <div className="grid gap-4 lg:grid-cols-3">
              <DocumentPreview label="Shop front" url={verification.shopFrontImageUrl} />
              <DocumentPreview label="GST certificate" url={verification.gstCertificateImageUrl} />
              <DocumentPreview label="Shop license" url={verification.shopLicenseImageUrl} />
            </div>
          </DashboardSection>

          <DashboardSection
            title="Decision"
            description="Approvals and rejections update the jeweller business verification status immediately."
          >
            {canReview ? (
              <div className="space-y-4">
                <label className="block min-w-0 text-sm font-semibold text-(--gw-color-green)">
                  Review notes
                  <textarea
                    value={reviewNotes}
                    onChange={(event) => setReviewNotes(event.target.value)}
                    maxLength={1000}
                    rows={3}
                    className="mt-2 w-full resize-none rounded-2xl border border-(--gw-color-border) bg-white px-4 py-3 text-sm outline-none focus:border-(--gw-color-gold)"
                    placeholder="Record what was verified and why this decision is appropriate"
                  />
                </label>

                <div className="grid gap-4 lg:grid-cols-[auto_1fr]">
                  <button
                    type="button"
                    onClick={handleApprove}
                    disabled={isApproving || isRejecting}
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-(--gw-color-green) px-5 text-sm font-semibold text-(--gw-color-cream) transition hover:bg-(--gw-color-green-soft) disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    <BadgeCheck className="h-4 w-4" aria-hidden="true" />
                    {isApproving ? "Approving..." : "Approve"}
                  </button>

                  <form className="grid gap-3 sm:grid-cols-[1fr_auto]" onSubmit={handleReject}>
                    <label className="block min-w-0 text-sm font-semibold text-(--gw-color-green)">
                      Rejection reason
                      <textarea
                        value={rejectionReason}
                        onChange={(event) => setRejectionReason(event.target.value)}
                        maxLength={1000}
                        rows={3}
                        className="mt-2 w-full resize-none rounded-2xl border border-(--gw-color-border) bg-white px-4 py-3 text-sm outline-none focus:border-(--gw-color-gold)"
                        placeholder="Explain what the jeweller must correct"
                      />
                    </label>
                    <button
                      type="submit"
                      disabled={isApproving || isRejecting}
                      className="inline-flex h-11 items-center justify-center gap-2 self-end rounded-full border border-(--gw-color-copper)/30 bg-(--gw-color-copper)/10 px-5 text-sm font-semibold text-(--gw-color-copper) transition hover:bg-(--gw-color-copper)/15 disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      <XCircle className="h-4 w-4" aria-hidden="true" />
                      {isRejecting ? "Rejecting..." : "Reject"}
                    </button>
                  </form>
                </div>
              </div>
            ) : (
              <p className="rounded-2xl bg-(--gw-color-cream) px-4 py-3 text-sm text-(--gw-color-muted)">
                This business verification has already been reviewed.
              </p>
            )}
          </DashboardSection>
        </>
      ) : null}
    </div>
  );
}

function StatusPill({ status }) {
  return (
    <span className="inline-flex h-10 items-center rounded-full bg-(--gw-color-cream) px-4 text-xs font-semibold text-(--gw-color-green)">
      {status}
    </span>
  );
}

function InfoCard({ icon: Icon, label, value, detail }) {
  return (
    <div className="rounded-2xl border border-(--gw-color-border) bg-(--gw-color-cream) p-4">
      <Icon className="h-5 w-5 text-(--gw-color-gold)" aria-hidden="true" />
      <p className="mt-3 text-xs font-semibold uppercase tracking-[0.14em] text-(--gw-color-muted)">
        {label}
      </p>
      <p className="gw-break-text mt-1 text-base font-semibold text-(--gw-color-green)">
        {value || "Not available"}
      </p>
      <p className="gw-break-text mt-1 text-sm text-(--gw-color-muted)">
        {detail || "Not available"}
      </p>
    </div>
  );
}

function DetailRow({ label, value }) {
  return (
    <div className="rounded-2xl border border-(--gw-color-border) bg-white px-4 py-3">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-(--gw-color-muted)">
        {label}
      </p>
      <p className="gw-break-text mt-1 text-sm font-semibold text-(--gw-color-green)">
        {value === null || value === undefined || value === "" ? "Not available" : value}
      </p>
    </div>
  );
}

function DocumentPreview({ label, url }) {
  const [loadFailed, setLoadFailed] = useState(false);

  return (
    <div className="min-w-0 rounded-3xl border border-(--gw-color-border) bg-(--gw-color-cream)/70 p-3">
      {url && !loadFailed ? (
        <img
          src={url}
          alt={label}
          loading="lazy"
          decoding="async"
          className="aspect-[4/3] w-full rounded-2xl object-cover"
          onError={() => setLoadFailed(true)}
        />
      ) : (
        <div className="flex aspect-[4/3] flex-col items-center justify-center gap-3 rounded-2xl bg-white px-4 text-center text-sm text-(--gw-color-muted)">
          <FileImage className="h-6 w-6" aria-hidden="true" />
          <span>{label} document is unavailable or expired.</span>
        </div>
      )}
      <p className="mt-3 text-sm font-semibold text-(--gw-color-green)">
        {label}
      </p>
    </div>
  );
}
