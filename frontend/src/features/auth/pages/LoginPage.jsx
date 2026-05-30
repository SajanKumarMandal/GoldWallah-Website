import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { ROUTES } from "@/constants/routes";
import { useAuth } from "@/features/auth/context/useAuth";
import AuthCard from "@/features/auth/components/AuthCard";
import AuthInput from "@/features/auth/components/AuthInput";
import AuthLayout from "@/features/auth/components/AuthLayout";
import AuthMethodTabs from "@/features/auth/components/AuthMethodTabs";
import PasswordInput from "@/features/auth/components/PasswordInput";
import {
  loginUser,
  sendLoginOtp,
  verifyLoginOtp,
} from "@/features/auth/services/authService";
import { AUTH_METHODS } from "@/features/auth/utils/authConstants";
import {
  validateLoginForm,
  validateLoginOtpSendForm,
  validateLoginOtpVerifyForm,
} from "@/features/auth/utils/authValidation";
import { getPostAuthRedirectPath } from "@/features/auth/utils/postAuthRedirect";

const authMethods = [
  { value: AUTH_METHODS.email, label: "Email" },
  { value: AUTH_METHODS.mobile, label: "Mobile OTP" },
];

const initialEmailValues = {
  email: "",
  password: "",
  rememberMe: false,
};

const initialOtpValues = {
  phone: "",
  otp: "",
};

export default function LoginPage() {
  const { setAuthSession } = useAuth();
  const navigate = useNavigate();
  const [activeMethod, setActiveMethod] = useState(AUTH_METHODS.email);
  const [emailValues, setEmailValues] = useState(initialEmailValues);
  const [otpValues, setOtpValues] = useState(initialOtpValues);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");

  function clearFeedback() {
    setErrors({});
    setStatusMessage("");
  }

  function updateEmailField(field, value) {
    setEmailValues((currentValues) => ({ ...currentValues, [field]: value }));
    setErrors((currentErrors) => ({ ...currentErrors, [field]: "" }));
    setStatusMessage("");
  }

  function updateOtpField(field, value) {
    setOtpValues((currentValues) => ({ ...currentValues, [field]: value }));
    setErrors((currentErrors) => ({ ...currentErrors, [field]: "" }));
    setStatusMessage("");
  }

  async function submitRequest(action, successMessage) {
    setIsSubmitting(true);
    setStatusMessage("");

    try {
      const result = await action();
      if (result?.data?.user) {
        setAuthSession({
          user: result.data.user,
          accessToken: result.data.accessToken,
        });
        navigate(getPostAuthRedirectPath(result.data.user), { replace: true });
        return;
      }
      setStatusMessage(successMessage);
    } catch (error) {
      setStatusMessage(error.message || "Unable to complete request. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleEmailSubmit(event) {
    event.preventDefault();
    const nextErrors = validateLoginForm(emailValues);
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    await submitRequest(
      () =>
        loginUser({
          email: emailValues.email.trim(),
          password: emailValues.password,
        }),
      "Login successful.",
    );
  }

  async function handleSendOtp(event) {
    event.preventDefault();
    const nextErrors = validateLoginOtpSendForm(otpValues);
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    await submitRequest(
      () => sendLoginOtp({ phone: otpValues.phone.trim() }),
      "OTP request sent if an account exists for this phone.",
    );
    setIsOtpSent(true);
  }

  async function handleVerifyOtp(event) {
    event.preventDefault();
    const nextErrors = validateLoginOtpVerifyForm(otpValues);
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    await submitRequest(
      () =>
        verifyLoginOtp({
          phone: otpValues.phone.trim(),
          otp: otpValues.otp.trim(),
        }),
      "OTP verified.",
    );
  }

  return (
    <AuthLayout
      eyebrow="Secure access"
      title="Sign in to a verified gold marketplace."
      description="Access your GoldWallah account through a clean, role-ready authentication flow built for trust and privacy."
    >
      <AuthCard
        title="Welcome back"
        description="Use email/password or mobile OTP. Private bidding details stay inside verified account areas."
        footer={
          <>
            New to GoldWallah?{" "}
            <Link
              to={ROUTES.register}
              className="font-semibold text-(--gw-color-green) underline decoration-(--gw-color-gold)/55 underline-offset-4 transition hover:text-(--gw-color-green-soft)"
            >
              Create an account
            </Link>
          </>
        }
      >
        <div className="space-y-6">
          <AuthMethodTabs
            activeMethod={activeMethod}
            methods={authMethods}
            onChange={(method) => {
              setActiveMethod(method);
              clearFeedback();
            }}
          />

          {activeMethod === AUTH_METHODS.email ? (
            <form className="space-y-5" onSubmit={handleEmailSubmit} noValidate>
              <AuthInput
                id="email"
                label="Email"
                type="email"
                autoComplete="email"
                placeholder="name@example.com"
                value={emailValues.email}
                onChange={(event) => updateEmailField("email", event.target.value)}
                error={errors.email}
                disabled={isSubmitting}
              />

              <PasswordInput
                id="password"
                label="Password"
                autoComplete="current-password"
                placeholder="Enter your password"
                value={emailValues.password}
                onChange={(event) => updateEmailField("password", event.target.value)}
                error={errors.password}
                disabled={isSubmitting}
              />

              <div className="flex flex-col gap-3 text-sm sm:flex-row sm:items-center sm:justify-between">
                <label className="flex items-center gap-3 text-(--gw-color-muted)">
                  <input
                    type="checkbox"
                    checked={emailValues.rememberMe}
                    onChange={(event) =>
                      updateEmailField("rememberMe", event.target.checked)
                    }
                    disabled={isSubmitting}
                    className="h-4 w-4 rounded border-(--gw-color-border) accent-(--gw-color-green)"
                  />
                  Remember me
                </label>
                <Link
                  to="#"
                  className="font-medium text-(--gw-color-green) transition hover:text-(--gw-color-green-soft)"
                >
                  Forgot password?
                </Link>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex h-12 w-full items-center justify-center rounded-full bg-(--gw-color-green) px-6 text-sm font-semibold text-(--gw-color-cream) shadow-[0_16px_34px_rgba(26,54,45,0.22)] transition hover:bg-(--gw-color-green-soft) focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-(--gw-color-gold) disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isSubmitting ? "Signing in..." : "Sign in"}
              </button>
            </form>
          ) : (
            <form className="space-y-5" onSubmit={isOtpSent ? handleVerifyOtp : handleSendOtp} noValidate>
              <AuthInput
                id="loginPhone"
                label="Phone number"
                type="tel"
                autoComplete="tel"
                placeholder="+91 98765 43210"
                value={otpValues.phone}
                onChange={(event) => updateOtpField("phone", event.target.value)}
                error={errors.phone}
                disabled={isSubmitting || isOtpSent}
              />

              {isOtpSent ? (
                <AuthInput
                  id="loginOtp"
                  label="OTP"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  placeholder="Enter OTP"
                  value={otpValues.otp}
                  onChange={(event) => updateOtpField("otp", event.target.value)}
                  error={errors.otp}
                  disabled={isSubmitting}
                />
              ) : null}

              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex h-12 w-full items-center justify-center rounded-full bg-(--gw-color-green) px-6 text-sm font-semibold text-(--gw-color-cream) shadow-[0_16px_34px_rgba(26,54,45,0.22)] transition hover:bg-(--gw-color-green-soft) focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-(--gw-color-gold) disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isSubmitting
                  ? "Please wait..."
                  : isOtpSent
                    ? "Verify OTP"
                    : "Send OTP"}
              </button>

              {isOtpSent ? (
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={handleSendOtp}
                  className="w-full text-sm font-semibold text-(--gw-color-green) transition hover:text-(--gw-color-green-soft) disabled:cursor-not-allowed disabled:opacity-70"
                >
                  Resend OTP
                </button>
              ) : null}
            </form>
          )}

          {statusMessage ? (
            <p className="rounded-2xl bg-(--gw-color-gold)/12 px-4 py-3 text-sm text-(--gw-color-green)">
              {statusMessage}
            </p>
          ) : null}
        </div>
      </AuthCard>
    </AuthLayout>
  );
}
