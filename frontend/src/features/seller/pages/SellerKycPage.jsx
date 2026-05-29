import { Link } from "react-router-dom";
import { useEffect, useRef, useState } from "react";

import { ROUTES } from "@/constants/routes";
import { useAuth } from "@/features/auth/context/useAuth";
import DashboardHeader from "@/features/dashboard/components/DashboardHeader";
import DashboardSection from "@/features/dashboard/components/DashboardSection";
import KycRejectionAlert from "@/features/seller/components/kyc/KycRejectionAlert";
import KycStatusCard from "@/features/seller/components/kyc/KycStatusCard";
import KycSubmittedPreview from "@/features/seller/components/kyc/KycSubmittedPreview";
import SellerKycForm from "@/features/seller/components/kyc/SellerKycForm";
import { KYC_STATUS } from "@/features/seller/constants/kycStatus";
import {
  getMySellerKyc,
  submitSellerKyc,
} from "@/features/seller/services/sellerKycService";

function resolveStatus(payload) {
  return payload?.submission?.status || payload?.kycStatus || KYC_STATUS.notSubmitted;
}

export default function SellerKycPage() {
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

  useEffect(() => {
    let isMounted = true;

    async function loadKyc() {
      setIsLoading(true);
      setErrorMessage("");

      try {
        const result = await getMySellerKyc(accessToken);

        if (!isMounted) {
          return;
        }

        setKycPayload(result?.data || null);
        const nextStatus = resolveStatus(result?.data);

        if (nextStatus && userRef.current) {
          setAuthUser({ ...userRef.current, kycStatus: nextStatus });
        }
      } catch (error) {
        if (isMounted) {
          setErrorMessage(error.message || "Unable to load seller KYC status.");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadKyc();

    return () => {
      isMounted = false;
    };
  }, [accessToken, setAuthUser]);

  const submission = kycPayload?.submission || null;
  const status = resolveStatus(kycPayload);
  const canSubmit = status === KYC_STATUS.notSubmitted || status === KYC_STATUS.rejected;

  async function handleSubmit(formData) {
    setIsSubmitting(true);
    setErrorMessage("");
    setStatusMessage("");

    try {
      const result = await submitSellerKyc(formData, accessToken);
      setKycPayload(result?.data || null);
      setStatusMessage("Your KYC has been submitted for verification.");
      setShowSubmittedDetails(false);

      if (result?.data?.kycStatus && userRef.current) {
        setAuthUser({ ...userRef.current, kycStatus: result.data.kycStatus });
      }
    } catch (error) {
      setErrorMessage(error.message || "Unable to submit seller KYC.");
      if (import.meta.env.DEV) {
        console.warn("Seller KYC submit failed", {
          message: error.message,
        });
      }
      throw error;
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <DashboardHeader
        eyebrow="Seller verification"
        title="Complete KYC before listing gold."
        description="Submit your Aadhaar details, PAN, Aadhaar address, and a camera-captured selfie for review."
      />

      {isLoading ? (
        <p className="rounded-2xl bg-(--gw-color-cream) px-4 py-3 text-sm text-(--gw-color-muted)">
          Loading KYC status...
        </p>
      ) : (
        <KycStatusCard status={status} />
      )}

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

      {status === KYC_STATUS.rejected ? (
        <KycRejectionAlert reason={submission?.rejectionReason} />
      ) : null}

      {status === KYC_STATUS.pending ? (
        <div className="flex flex-wrap gap-3">
          <Link
            to={ROUTES.sellerDashboard}
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
          to={ROUTES.sellerDashboard}
          className="inline-flex h-12 items-center justify-center rounded-full bg-(--gw-color-green) px-6 text-sm font-semibold text-(--gw-color-cream) shadow-[0_16px_34px_rgba(26,54,45,0.18)] transition hover:bg-(--gw-color-green-soft) focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-(--gw-color-gold)"
        >
          Go to seller dashboard
        </Link>
      ) : null}

      {canSubmit && !isLoading ? (
        <DashboardSection
          title="Seller KYC details"
          description="Use your device camera to capture a fresh selfie before submitting."
        >
          <SellerKycForm
            initialDetails={status === KYC_STATUS.rejected ? submission : null}
            isSubmitting={isSubmitting}
            onSubmit={handleSubmit}
          />
        </DashboardSection>
      ) : null}
    </div>
  );
}
