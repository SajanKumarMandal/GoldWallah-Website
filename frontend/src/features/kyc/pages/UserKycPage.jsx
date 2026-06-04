import { Link } from "react-router-dom";
import { useCallback, useEffect, useRef, useState } from "react";

import { ROUTES } from "@/constants/routes";
import { useAuth } from "@/features/auth/context/useAuth";
import DashboardHeader from "@/features/dashboard/components/DashboardHeader";
import DashboardSection from "@/features/dashboard/components/DashboardSection";
import { getMyJewellerKyc, submitJewellerKyc } from "@/features/jeweller/services/jewellerKycService";
import KycRejectionAlert from "@/features/seller/components/kyc/KycRejectionAlert";
import KycStatusCard from "@/features/seller/components/kyc/KycStatusCard";
import KycSubmittedPreview from "@/features/seller/components/kyc/KycSubmittedPreview";
import SellerKycForm from "@/features/seller/components/kyc/SellerKycForm";
import { KYC_STATUS } from "@/features/seller/constants/kycStatus";
import {
  getMySellerKyc,
  submitSellerKyc,
} from "@/features/seller/services/sellerKycService";

const KYC_POLL_INTERVAL_MS = 15_000;

const kycConfig = {
  seller: {
    roleLabel: "Seller",
    eyebrow: "Seller verification",
    title: "Complete KYC before listing gold.",
    description:
      "Submit your Aadhaar details, PAN, Aadhaar address, and a camera-captured selfie for review.",
    loadingText: "Loading seller KYC status...",
    loadErrorText: "Unable to load seller KYC status.",
    submitErrorText: "Unable to submit seller KYC.",
    submittedText: "Your KYC has been submitted for verification.",
    approvedPollText: "Your KYC has been approved. You can now create a listing.",
    rejectedPollText: "Your KYC was rejected. Review the reason and resubmit.",
    pendingDashboardRoute: ROUTES.sellerDashboard,
    approvedRoute: ROUTES.sellerNewListing,
    approvedCta: "Create new listing",
    formTitle: "Seller KYC details",
    formDescription: "Use your device camera to capture a fresh selfie before submitting.",
    getMyKyc: getMySellerKyc,
    submitKyc: submitSellerKyc,
  },
  jeweller: {
    roleLabel: "Jeweller",
    eyebrow: "Jeweller KYC",
    title: "Complete KYC before bidding.",
    description:
      "Submit your Aadhaar details, PAN, Aadhaar address, and a camera-captured selfie for identity review.",
    loadingText: "Loading jeweller KYC status...",
    loadErrorText: "Unable to load jeweller KYC status.",
    submitErrorText: "Unable to submit jeweller KYC.",
    submittedText: "Your jeweller KYC has been submitted for verification.",
    approvedPollText:
      "Your KYC has been approved. Complete business verification to unlock bidding.",
    rejectedPollText: "Your KYC was rejected. Review the reason and resubmit.",
    pendingDashboardRoute: ROUTES.jewellerDashboard,
    approvedRoute: ROUTES.jewellerVerification,
    approvedCta: "Continue business verification",
    formTitle: "Jeweller KYC details",
    formDescription:
      "Use your device camera to capture a fresh selfie before submitting jeweller KYC.",
    getMyKyc: getMyJewellerKyc,
    submitKyc: submitJewellerKyc,
  },
};

function resolveStatus(payload) {
  return payload?.submission?.status || payload?.kycStatus || KYC_STATUS.notSubmitted;
}

function resolveLiveStatus(payload, user) {
  const payloadStatus = resolveStatus(payload);

  if (
    payloadStatus === KYC_STATUS.pending &&
    [KYC_STATUS.approved, KYC_STATUS.rejected].includes(user?.kycStatus)
  ) {
    return user.kycStatus;
  }

  return payloadStatus;
}

export default function UserKycPage({ audience }) {
  const config = kycConfig[audience] || kycConfig.seller;
  const { accessToken, user, setAuthUser } = useAuth();
  const userRef = useRef(user);
  const [kycPayload, setKycPayload] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [showSubmittedDetails, setShowSubmittedDetails] = useState(false);

  useEffect(() => {
    userRef.current = user;
  }, [user]);

  const applyKycPayload = useCallback(
    (payload) => {
      setKycPayload(payload || null);
      const nextStatus = resolveStatus(payload);

      if (nextStatus && userRef.current) {
        setAuthUser({ ...userRef.current, kycStatus: nextStatus });
      }
    },
    [setAuthUser],
  );

  const refreshKyc = useCallback(
    async ({ showLoading = false, showErrors = true } = {}) => {
      if (!accessToken) {
        setKycPayload(null);
        setErrorMessage("Please login again.");
        setIsLoading(false);
        if (import.meta.env.DEV) {
          console.warn(`${config.roleLabel} KYC fetch skipped`, {
            reason: "missing_access_token",
            hasUser: Boolean(userRef.current),
          });
        }
        return null;
      }

      if (showLoading) {
        setIsLoading(true);
      }
      if (showErrors) {
        setErrorMessage("");
      }

      try {
        const result = await config.getMyKyc(accessToken);
        const payload = result?.data || null;
        applyKycPayload(payload);
        return payload;
      } catch (error) {
        if (showErrors) {
          setErrorMessage(error.message || config.loadErrorText);
        }
        return null;
      } finally {
        if (showLoading) {
          setIsLoading(false);
        }
      }
    },
    [accessToken, applyKycPayload, config],
  );

  useEffect(() => {
    let isMounted = true;

    async function loadKyc() {
      await refreshKyc({ showLoading: true, showErrors: true });

      if (!isMounted) {
        return;
      }
    }

    loadKyc();

    return () => {
      isMounted = false;
    };
  }, [refreshKyc]);

  const submission = kycPayload?.submission || null;
  const status = resolveLiveStatus(kycPayload, user);
  const canSubmit = status === KYC_STATUS.notSubmitted || status === KYC_STATUS.rejected;

  useEffect(() => {
    if (status !== KYC_STATUS.pending) {
      return undefined;
    }

    let isMounted = true;
    let isPolling = false;
    let timerId;

    async function pollKycStatus() {
      if (isPolling) {
        return;
      }

      if (document.visibilityState === "hidden") {
        timerId = window.setTimeout(pollKycStatus, KYC_POLL_INTERVAL_MS);
        return;
      }

      isPolling = true;

      try {
        const nextPayload = await refreshKyc({
          showLoading: false,
          showErrors: false,
        });

        if (!isMounted) {
          return;
        }

        if (nextPayload) {
          const nextStatus = resolveStatus(nextPayload);
          if (nextStatus === KYC_STATUS.approved) {
            setStatusMessage(config.approvedPollText);
          } else if (nextStatus === KYC_STATUS.rejected) {
            setStatusMessage(config.rejectedPollText);
          }
        }
      } finally {
        isPolling = false;

        if (isMounted) {
          timerId = window.setTimeout(pollKycStatus, KYC_POLL_INTERVAL_MS);
        }
      }
    }

    function handleVisibilityChange() {
      if (document.visibilityState === "visible") {
        window.clearTimeout(timerId);
        pollKycStatus();
      }
    }

    timerId = window.setTimeout(pollKycStatus, KYC_POLL_INTERVAL_MS);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      isMounted = false;
      window.clearTimeout(timerId);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [config, refreshKyc, status]);

  async function handleSubmit(formData) {
    if (!accessToken) {
      const message = "Please login again.";
      setErrorMessage(message);
      if (import.meta.env.DEV) {
        console.warn(`${config.roleLabel} KYC submit blocked`, {
          reason: "missing_access_token",
        });
      }
      throw new Error(message);
    }

    setIsSubmitting(true);
    setErrorMessage("");
    setStatusMessage("");

    try {
      if (import.meta.env.DEV) {
        console.debug(`${config.roleLabel} KYC submit started`, {
          formDataKeys: Array.from(formData.keys()),
          hasSelfieImage: formData.get("selfieImage") instanceof File,
          hasSelfieCapturedAt: Boolean(formData.get("selfieCapturedAt")),
        });
      }

      const result = await config.submitKyc(formData, accessToken);
      applyKycPayload(result?.data || null);
      setStatusMessage(config.submittedText);
      setShowSubmittedDetails(false);
    } catch (error) {
      const message =
        error.status === 401
          ? "Please login again."
          : error.message || config.submitErrorText;
      setErrorMessage(message);
      if (import.meta.env.DEV) {
        console.warn(`${config.roleLabel} KYC submit failed`, {
          status: error.status,
          message: error.message,
        });
      }
      throw new Error(message, { cause: error });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <DashboardHeader
        eyebrow={config.eyebrow}
        title={config.title}
        description={config.description}
      />

      {isLoading ? (
        <p className="rounded-2xl bg-(--gw-color-cream) px-4 py-3 text-sm text-(--gw-color-muted)">
          {config.loadingText}
        </p>
      ) : (
        <KycStatusCard
          status={status}
          roleLabel={config.roleLabel}
          approvedDescription={
            audience === "jeweller"
              ? "Identity verification is approved for this jeweller account."
              : undefined
          }
          approvedTitle={
            audience === "jeweller"
              ? "Your KYC is approved. Continue business verification."
              : undefined
          }
          pendingDescription={
            audience === "jeweller"
              ? "Bidding unlocks after both KYC and business verification are approved."
              : undefined
          }
        />
      )}

      {errorMessage ? (
        <div className="flex flex-col gap-3 rounded-2xl bg-(--gw-color-copper)/10 px-4 py-3 text-sm font-medium text-(--gw-color-copper) sm:flex-row sm:items-center sm:justify-between">
          <span>{errorMessage}</span>
          {errorMessage === "Please login again." ? (
            <Link
              to={ROUTES.login}
              className="inline-flex h-10 items-center justify-center rounded-full bg-white px-4 text-sm font-semibold text-(--gw-color-green) transition hover:bg-(--gw-color-cream)"
            >
              Login
            </Link>
          ) : null}
        </div>
      ) : null}

      {statusMessage ? (
        <p className="rounded-2xl bg-(--gw-color-gold)/12 px-4 py-3 text-sm font-medium text-(--gw-color-green)">
          {statusMessage}
        </p>
      ) : null}

      {status === KYC_STATUS.rejected ? (
        <KycRejectionAlert reason={submission?.rejectionReason} />
      ) : null}

      {status === KYC_STATUS.pending ? (
        <div className="flex flex-wrap gap-3">
          <Link
            to={config.pendingDashboardRoute}
            className="inline-flex h-11 items-center justify-center rounded-full bg-(--gw-color-green) px-5 text-sm font-semibold text-(--gw-color-cream) transition hover:bg-(--gw-color-green-soft)"
          >
            Go to Dashboard
          </Link>
          <button
            type="button"
            onClick={() => setShowSubmittedDetails((current) => !current)}
            className="inline-flex h-11 items-center justify-center rounded-full border border-(--gw-color-border) bg-white px-5 text-sm font-semibold text-(--gw-color-green) transition hover:border-(--gw-color-gold)"
          >
            View Submitted Details
          </button>
        </div>
      ) : null}

      {submission &&
      status !== KYC_STATUS.rejected &&
      (status !== KYC_STATUS.pending || showSubmittedDetails) ? (
        <DashboardSection
          title="Submitted KYC"
          description="Safe details from your latest KYC submission."
        >
          <KycSubmittedPreview submission={submission} />
        </DashboardSection>
      ) : null}

      {status === KYC_STATUS.approved ? (
        <Link
          to={config.approvedRoute}
          className="inline-flex h-12 items-center justify-center rounded-full bg-(--gw-color-green) px-6 text-sm font-semibold text-(--gw-color-cream) shadow-[0_16px_34px_rgba(26,54,45,0.18)] transition hover:bg-(--gw-color-green-soft) focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-(--gw-color-gold)"
        >
          {config.approvedCta}
        </Link>
      ) : null}

      {canSubmit && !isLoading ? (
        <DashboardSection
          title={config.formTitle}
          description={config.formDescription}
        >
          <SellerKycForm
            initialDetails={status === KYC_STATUS.rejected ? submission : null}
            isSubmitting={isSubmitting}
            contextLabel={config.roleLabel}
            onSubmit={handleSubmit}
          />
        </DashboardSection>
      ) : null}
    </div>
  );
}
