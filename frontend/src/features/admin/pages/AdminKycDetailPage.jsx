import {
  ArrowLeft,
  BadgeCheck,
  CalendarClock,
  IdCard,
  ShieldAlert,
  XCircle,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useOutletContext, useParams } from "react-router-dom";

import { ROUTES } from "@/constants/routes";
import { clearAdminSession } from "@/features/admin/auth/utils/adminTokenStorage";
import {
  approveSellerKyc,
  getSellerKycSubmission,
  rejectSellerKyc,
} from "@/features/admin/services/adminKycService";
import DashboardHeader from "@/features/dashboard/components/DashboardHeader";
import DashboardSection from "@/features/dashboard/components/DashboardSection";
import { formatDateTime } from "@/utils/formatDate";

function maskAadhaar(value) {
  if (!value || value.length < 4) {
    return "Not available";
  }

  return `XXXX XXXX ${value.slice(-4)}`;
}

function maskPan(value) {
  if (!value || value.length < 4) {
    return "Not available";
  }

  return `******${value.slice(-4)}`;
}

function normalizeSubmission(result) {
  return result?.data?.submission || result?.data || null;
}

export default function AdminKycDetailPage() {
  const { accessToken } = useOutletContext();
  const { kycId } = useParams();
  const navigate = useNavigate();
  const [submission, setSubmission] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isApproving, setIsApproving] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [statusMessage, setStatusMessage] = useState("");

  const canReview = submission?.status === "PENDING";
  const selfieUrl = submission?.selfieImageUrl || "";
  const reviewedStatus = useMemo(() => {
    if (!submission) {
      return "";
    }

    if (submission.status === "PENDING") {
      return "Awaiting admin decision";
    }

    return `${submission.status} on ${formatDateTime(submission.reviewedAt || submission.updatedAt)}`;
  }, [submission]);

  async function loadSubmission() {
    setIsLoading(true);
    setErrorMessage("");

    try {
      const result = await getSellerKycSubmission({ accessToken, kycId });
      setSubmission(normalizeSubmission(result));
    } catch (error) {
      if (error.status === 401) {
        clearAdminSession();
        navigate(ROUTES.adminLogin, { replace: true });
        return;
      }

      setErrorMessage(error.message || "Unable to load KYC submission.");
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
        const result = await getSellerKycSubmission({ accessToken, kycId });

        if (isMounted) {
          setSubmission(normalizeSubmission(result));
        }
      } catch (error) {
        if (error.status === 401) {
          clearAdminSession();
          navigate(ROUTES.adminLogin, { replace: true });
          return;
        }

        if (isMounted) {
          setErrorMessage(error.message || "Unable to load KYC submission.");
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
  }, [accessToken, kycId, navigate]);

  async function handleApprove() {
    const confirmed = window.confirm("Approve this seller KYC submission?");

    if (!confirmed) {
      return;
    }

    setIsApproving(true);
    setErrorMessage("");
    setStatusMessage("");

    try {
      const result = await approveSellerKyc({ accessToken, kycId });
      setSubmission(normalizeSubmission(result));
      setStatusMessage("Seller KYC approved.");
      navigate(ROUTES.adminKyc, {
        replace: false,
        state: { refreshedAt: Date.now(), status: "PENDING" },
      });
    } catch (error) {
      if (error.status === 401) {
        clearAdminSession();
        navigate(ROUTES.adminLogin, { replace: true });
        return;
      }

      setErrorMessage(error.message || "Unable to approve KYC submission.");
      await loadSubmission();
    } finally {
      setIsApproving(false);
    }
  }

  async function handleReject(event) {
    event.preventDefault();
    const reason = rejectionReason.trim();

    if (!reason) {
      setErrorMessage("Rejection reason is required.");
      return;
    }

    setIsRejecting(true);
    setErrorMessage("");
    setStatusMessage("");

    try {
      const result = await rejectSellerKyc({
        accessToken,
        kycId,
        rejectionReason: reason,
      });
      setSubmission(normalizeSubmission(result));
      setRejectionReason("");
      setStatusMessage("Seller KYC rejected.");
      navigate(ROUTES.adminKyc, {
        replace: false,
        state: { refreshedAt: Date.now(), status: "PENDING" },
      });
    } catch (error) {
      if (error.status === 401) {
        clearAdminSession();
        navigate(ROUTES.adminLogin, { replace: true });
        return;
      }

      setErrorMessage(error.message || "Unable to reject KYC submission.");
      await loadSubmission();
    } finally {
      setIsRejecting(false);
    }
  }

  return (
    <div className="space-y-6">
      <DashboardHeader
        eyebrow="Admin KYC review"
        title={submission?.fullName || "Seller KYC detail"}
        description="Full identity values are shown only in this audited admin review screen."
        action={
          <Link
            to={ROUTES.adminKyc}
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
          Loading KYC submission...
        </p>
      ) : null}

      {!isLoading && submission ? (
        <>
          <DashboardSection
            title="Review summary"
            description="Compare the submitted identity details before taking any action."
            action={<StatusPill status={submission.status} />}
          >
            <div className="grid gap-4 lg:grid-cols-3">
              <InfoCard
                icon={IdCard}
                label="Seller"
                value={submission.fullName || "Not available"}
                detail={submission.mobileNumber || "Mobile unavailable"}
              />
              <InfoCard
                icon={CalendarClock}
                label="Submitted"
                value={formatDateTime(submission.createdAt)}
                detail={reviewedStatus}
              />
              <InfoCard
                icon={ShieldAlert}
                label="Identity check"
                value={maskAadhaar(submission.aadhaarNumber)}
                detail={maskPan(submission.panNumber)}
              />
            </div>
          </DashboardSection>

          <DashboardSection title="Identity details">
            <div className="grid gap-4 lg:grid-cols-[1fr_20rem]">
              <div className="space-y-3">
                <DetailRow label="Full name" value={submission.fullName} />
                <DetailRow label="Mobile number" value={submission.mobileNumber} />
                <DetailRow label="Aadhaar number" value={submission.aadhaarNumber} />
                <DetailRow label="PAN number" value={submission.panNumber} />
                <DetailRow
                  label="Selfie captured"
                  value={formatDateTime(submission.selfieCapturedAt)}
                />
                <div className="rounded-2xl border border-(--gw-color-border) bg-white px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-(--gw-color-muted)">
                    Address as per Aadhaar
                  </p>
                  <p className="gw-break-text mt-2 whitespace-pre-wrap text-sm font-semibold leading-6 text-(--gw-color-green)">
                    {submission.addressAsPerAadhaar || "Not available"}
                  </p>
                </div>
                {submission.rejectionReason ? (
                  <div className="rounded-2xl border border-(--gw-color-copper)/30 bg-(--gw-color-copper)/10 px-4 py-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-(--gw-color-copper)">
                      Rejection reason
                    </p>
                    <p className="gw-break-text mt-2 whitespace-pre-wrap text-sm font-semibold leading-6 text-(--gw-color-copper)">
                      {submission.rejectionReason}
                    </p>
                  </div>
                ) : null}
              </div>

              <div className="min-w-0">
                <p className="mb-2 text-sm font-semibold text-(--gw-color-green)">
                  Live selfie
                </p>
                <div className="aspect-[3/4] overflow-hidden rounded-2xl border border-(--gw-color-border) bg-(--gw-color-cream)">
                  {selfieUrl ? (
                    <img
                      src={selfieUrl}
                      alt={`${submission.fullName || "Seller"} selfie`}
                      className="h-full w-full object-cover"
                      loading="lazy"
                      decoding="async"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center px-4 text-center text-sm text-(--gw-color-muted)">
                      Selfie preview is unavailable.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </DashboardSection>

          <DashboardSection
            title="Decision"
            description="Approvals and rejections update the seller account immediately."
          >
            {canReview ? (
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
                      placeholder="Explain what the seller must correct"
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
            ) : (
              <p className="rounded-2xl bg-(--gw-color-cream) px-4 py-3 text-sm text-(--gw-color-muted)">
                This submission has already been reviewed.
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
        {value || "Not available"}
      </p>
    </div>
  );
}
