import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { ROUTES } from "@/constants/routes";
import AuthInput from "@/features/auth/components/AuthInput";
import { useAuth } from "@/features/auth/context/useAuth";
import {
  sendPhoneVerification,
  verifyPhone,
} from "@/features/auth/services/authService";
import {
  validatePhoneVerificationSendForm,
  validatePhoneVerificationVerifyForm,
} from "@/features/auth/utils/authValidation";

export default function PhoneVerificationPage() {
  const { user, accessToken, setAuthUser } = useAuth();
  const navigate = useNavigate();
  const [values, setValues] = useState({
    phone: user?.phone || "",
    otp: "",
  });
  const [errors, setErrors] = useState({});
  const [statusMessage, setStatusMessage] = useState("");
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function updateField(field, value) {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: "" }));
    setStatusMessage("");
  }

  async function handleSendOtp(event) {
    event.preventDefault();
    const nextErrors = validatePhoneVerificationSendForm(values);
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await sendPhoneVerification(accessToken, {
        phone: values.phone.trim() || undefined,
      });
      setIsOtpSent(true);
      setStatusMessage(result?.message || "Verification OTP sent.");
    } catch (error) {
      setStatusMessage(error.message || "OTP could not be sent.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleVerifyOtp(event) {
    event.preventDefault();
    const nextErrors = validatePhoneVerificationVerifyForm(values);
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await verifyPhone(accessToken, {
        phone: values.phone.trim(),
        otp: values.otp.trim(),
      });
      if (result?.data?.user) {
        setAuthUser(result.data.user);
      }
      setStatusMessage(result?.message || "Phone verified successfully.");
      navigate(ROUTES.accountSecurity, { replace: true });
    } catch (error) {
      setStatusMessage(error.message || "OTP is invalid or expired.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-xl rounded-2xl border border-(--gw-color-border) bg-white p-5">
      <h1 className="text-xl font-semibold text-(--gw-color-green)">Verify phone</h1>
      <p className="mt-2 text-sm leading-6 text-(--gw-color-muted)">
        Use an OTP to verify the phone number attached to your account.
      </p>

      <form
        className="mt-6 space-y-5"
        onSubmit={isOtpSent ? handleVerifyOtp : handleSendOtp}
        noValidate
      >
        <AuthInput
          id="phoneVerificationNumber"
          label="Phone number"
          type="tel"
          autoComplete="tel"
          value={values.phone}
          onChange={(event) => updateField("phone", event.target.value)}
          error={errors.phone}
          disabled={isSubmitting || isOtpSent}
        />
        {isOtpSent ? (
          <AuthInput
            id="phoneVerificationOtp"
            label="OTP"
            inputMode="numeric"
            autoComplete="one-time-code"
            value={values.otp}
            onChange={(event) => updateField("otp", event.target.value)}
            error={errors.otp}
            disabled={isSubmitting}
          />
        ) : null}
        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex h-11 w-full items-center justify-center rounded-full bg-(--gw-color-green) px-5 text-sm font-semibold text-(--gw-color-cream) disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isSubmitting ? "Please wait..." : isOtpSent ? "Verify OTP" : "Send OTP"}
        </button>
        {isOtpSent ? (
          <button
            type="button"
            onClick={handleSendOtp}
            disabled={isSubmitting}
            className="w-full text-sm font-semibold text-(--gw-color-green) disabled:cursor-not-allowed disabled:opacity-70"
          >
            Resend OTP
          </button>
        ) : null}
      </form>

      {statusMessage ? (
        <p className="mt-5 rounded-2xl bg-(--gw-color-gold)/12 px-4 py-3 text-sm text-(--gw-color-green)">
          {statusMessage}
        </p>
      ) : null}
    </div>
  );
}

