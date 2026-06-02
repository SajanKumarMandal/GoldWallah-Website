import { Link } from "react-router-dom";
import { useEffect, useRef, useState } from "react";

import { ROUTES } from "@/constants/routes";
import { useAuth } from "@/features/auth/context/useAuth";
import DashboardHeader from "@/features/dashboard/components/DashboardHeader";
import DashboardSection from "@/features/dashboard/components/DashboardSection";
import JewellerBusinessVerificationForm from "@/features/jeweller/components/verification/JewellerBusinessVerificationForm";
import JewellerVerificationRejectionAlert from "@/features/jeweller/components/verification/JewellerVerificationRejectionAlert";
import JewellerVerificationStatusCard from "@/features/jeweller/components/verification/JewellerVerificationStatusCard";
import JewellerVerificationSubmittedPreview from "@/features/jeweller/components/verification/JewellerVerificationSubmittedPreview";
import { JEWELLER_VERIFICATION_STATUS } from "@/features/jeweller/constants/jewellerVerificationStatus";
import {
  getMyJewellerVerification,
  submitJewellerVerification,
} from "@/features/jeweller/services/jewellerVerificationService";

function resolveStatus(payload) {
  return (
    payload?.verification?.status ||
    payload?.businessVerificationStatus ||
    JEWELLER_VERIFICATION_STATUS.notSubmitted
  );
}

export default function JewellerVerificationPage() {
  const { accessToken, user, setAuthUser } = useAuth();
  const userRef = useRef(user);
  const [verificationPayload, setVerificationPayload] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [statusMessage, setStatusMessage] = useState("");

  useEffect(() => {
    userRef.current = user;
  }, [user]);

  useEffect(() => {
    let isMounted = true;

    async function loadVerification() {
      if (!accessToken) {
        setVerificationPayload(null);
        setErrorMessage("Please login again.");
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setErrorMessage("");

      try {
        const result = await getMyJewellerVerification(accessToken);

        if (!isMounted) {
          return;
        }

        setVerificationPayload(result?.data || null);
        const nextStatus = resolveStatus(result?.data);

        if (nextStatus && userRef.current) {
          setAuthUser({
            ...userRef.current,
            businessVerificationStatus: nextStatus,
          });
        }
      } catch (error) {
        if (isMounted) {
          setErrorMessage(
            error.message || "Unable to load business verification status.",
          );
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadVerification();

    return () => {
      isMounted = false;
    };
  }, [accessToken, setAuthUser]);

  const verification = verificationPayload?.verification || null;
  const status = resolveStatus(verificationPayload);
  const kycStatus = user?.kycStatus || "NOT_SUBMITTED";
  const hasApprovedKyc = kycStatus === "APPROVED";
  const canSubmit =
    hasApprovedKyc &&
    (status === JEWELLER_VERIFICATION_STATUS.notSubmitted ||
      status === JEWELLER_VERIFICATION_STATUS.rejected);

  async function handleSubmit(formData) {
    if (!accessToken) {
      const message = "Please login again.";
      setErrorMessage(message);
      throw new Error(message);
    }

    setIsSubmitting(true);
    setErrorMessage("");
    setStatusMessage("");

    try {
      const result = await submitJewellerVerification(formData, accessToken);
      setVerificationPayload(result?.data || null);
      setStatusMessage("Your business verification has been submitted for review.");

      if (result?.data?.businessVerificationStatus && userRef.current) {
        setAuthUser({
          ...userRef.current,
          businessVerificationStatus: result.data.businessVerificationStatus,
        });
      }
    } catch (error) {
      const message = error.message || "Unable to submit business verification.";
      setErrorMessage(message);
      throw new Error(message, { cause: error });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <DashboardHeader
        eyebrow="Jeweller verification"
        title="Verify your jewellery business."
        description="Submit shop identity, address, location, and verification images for review."
      />

      {isLoading ? (
        <p className="rounded-2xl bg-(--gw-color-cream) px-4 py-3 text-sm text-(--gw-color-muted)">
          Loading business verification status...
        </p>
      ) : (
        <JewellerVerificationStatusCard status={status} />
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

      {!hasApprovedKyc ? (
        <div className="flex flex-col gap-3 rounded-2xl border border-(--gw-color-gold)/40 bg-(--gw-color-gold)/10 px-4 py-3 text-sm font-medium text-(--gw-color-green) sm:flex-row sm:items-center sm:justify-between">
          <span>
            Approved jeweller KYC is required before business verification.
          </span>
          <Link
            to={ROUTES.jewellerKyc}
            className="inline-flex h-10 items-center justify-center rounded-full bg-(--gw-color-green) px-4 text-sm font-semibold text-(--gw-color-cream) transition hover:bg-(--gw-color-green-soft)"
          >
            Complete KYC
          </Link>
        </div>
      ) : null}

      {status === JEWELLER_VERIFICATION_STATUS.rejected ? (
        <JewellerVerificationRejectionAlert
          reason={verification?.rejectionReason}
        />
      ) : null}

      {verification ? (
        <DashboardSection
          title="Submitted business details"
          description="Safe details from your latest business verification submission."
        >
          <JewellerVerificationSubmittedPreview verification={verification} />
        </DashboardSection>
      ) : null}

      {status === JEWELLER_VERIFICATION_STATUS.approved ? (
        <Link
          to={ROUTES.jewellerDashboard}
          className="inline-flex h-12 items-center justify-center rounded-full bg-(--gw-color-green) px-6 text-sm font-semibold text-(--gw-color-cream) shadow-[0_16px_34px_rgba(26,54,45,0.18)] transition hover:bg-(--gw-color-green-soft)"
        >
          Go to jeweller dashboard
        </Link>
      ) : null}

      {canSubmit && !isLoading ? (
        <DashboardSection
          title="Business verification form"
          description="Raw GST and license values are submitted securely and are not shown back to you after submission."
        >
          <JewellerBusinessVerificationForm
            isSubmitting={isSubmitting}
            onSubmit={handleSubmit}
          />
        </DashboardSection>
      ) : null}
    </div>
  );
}
