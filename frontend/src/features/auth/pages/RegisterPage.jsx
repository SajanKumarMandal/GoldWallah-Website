import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";

import { ROUTES } from "@/constants/routes";
import AuthCard from "@/features/auth/components/AuthCard";
import AuthInput from "@/features/auth/components/AuthInput";
import AuthLayout from "@/features/auth/components/AuthLayout";
import AuthMethodTabs from "@/features/auth/components/AuthMethodTabs";
import PasswordInput from "@/features/auth/components/PasswordInput";
import RoleSelector from "@/features/auth/components/RoleSelector";
import SocialAuthButtons from "@/features/auth/components/SocialAuthButtons";
import {
  registerUser,
  registerWithFacebook,
  registerWithGoogle,
  sendRegisterOtp,
  verifyRegisterOtp,
} from "@/features/auth/services/authService";
import {
  AUTH_METHODS,
  AUTH_ROLES,
  DEFAULT_REGISTER_ROLE,
} from "@/features/auth/utils/authConstants";
import {
  validateRegisterForm,
  validateRegisterOtpSendForm,
  validateRegisterOtpVerifyForm,
  validateSocialRegisterForm,
} from "@/features/auth/utils/authValidation";

const authMethods = [
  { value: AUTH_METHODS.email, label: "Email" },
  { value: AUTH_METHODS.mobile, label: "Mobile OTP" },
];

const initialValues = {
  fullName: "",
  email: "",
  phone: "",
  password: "",
  confirmPassword: "",
  role: DEFAULT_REGISTER_ROLE,
  otp: "",
  acceptTerms: false,
};

export default function RegisterPage() {
  const [searchParams] = useSearchParams();
  const initialRole = useMemo(() => {
    const requestedRole = searchParams.get("role");

    return Object.values(AUTH_ROLES).includes(requestedRole)
      ? requestedRole
      : DEFAULT_REGISTER_ROLE;
  }, [searchParams]);

  const [activeMethod, setActiveMethod] = useState(AUTH_METHODS.email);
  const [values, setValues] = useState({
    ...initialValues,
    role: initialRole,
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");

  function clearFeedback() {
    setErrors({});
    setStatusMessage("");
  }

  function updateField(field, value) {
    setValues((currentValues) => ({
      ...currentValues,
      [field]: value,
    }));
    setErrors((currentErrors) => ({
      ...currentErrors,
      [field]: "",
    }));
    setStatusMessage("");
  }

  async function submitRequest(action, successMessage) {
    setIsSubmitting(true);
    setStatusMessage("");

    try {
      await action();
      setStatusMessage(successMessage);
    } catch (error) {
      setStatusMessage(error.message || "Unable to complete request. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleEmailSubmit(event) {
    event.preventDefault();
    const nextErrors = validateRegisterForm(values);
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    await submitRequest(
      () =>
        registerUser({
          fullName: values.fullName.trim(),
          email: values.email.trim(),
          phone: values.phone.trim(),
          password: values.password,
          role: values.role,
        }),
      "Registration successful. Verification can be wired next.",
    );
  }

  async function handleSendOtp(event) {
    event.preventDefault();
    const nextErrors = validateRegisterOtpSendForm(values);
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    await submitRequest(
      () => sendRegisterOtp({ phone: values.phone.trim() }),
      "OTP sent. Enter it below to create the account.",
    );
    setIsOtpSent(true);
  }

  async function handleVerifyOtp(event) {
    event.preventDefault();
    const nextErrors = validateRegisterOtpVerifyForm(values);
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    await submitRequest(
      () =>
        verifyRegisterOtp({
          fullName: values.fullName.trim(),
          phone: values.phone.trim(),
          role: values.role,
          otp: values.otp.trim(),
        }),
      "Account created with phone verification. Role-based redirect can be wired next.",
    );
  }

  async function handleSocialRegister(provider) {
    const nextErrors = validateSocialRegisterForm(values);
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    const request =
      provider === "google"
        ? () => registerWithGoogle({ idToken: "placeholder", role: values.role })
        : () => registerWithFacebook({ accessToken: "placeholder", role: values.role });

    await submitRequest(request, "Social registration request prepared.");
  }

  return (
    <AuthLayout
      eyebrow="Verified onboarding"
      title="Create your GoldWallah account with confidence."
      description="Choose the right role during registration so your verification path, account permissions, and marketplace access stay clear from day one."
    >
      <AuthCard
        title="Create account"
        description="Seller accounts require KYC before listing gold. Jeweller accounts require KYC and business verification before bidding."
        footer={
          <>
            Already have an account?{" "}
            <Link
              to={ROUTES.login}
              className="font-semibold text-(--gw-color-green) underline decoration-(--gw-color-gold)/55 underline-offset-4 transition hover:text-(--gw-color-green-soft)"
            >
              Sign in
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
                id="fullName"
                label="Full name"
                autoComplete="name"
                placeholder="Your legal name"
                value={values.fullName}
                onChange={(event) => updateField("fullName", event.target.value)}
                error={errors.fullName}
                disabled={isSubmitting}
              />

              <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                <AuthInput
                  id="email"
                  label="Email"
                  type="email"
                  autoComplete="email"
                  placeholder="name@example.com"
                  value={values.email}
                  onChange={(event) => updateField("email", event.target.value)}
                  error={errors.email}
                  disabled={isSubmitting}
                />
                <AuthInput
                  id="phone"
                  label="Phone number"
                  type="tel"
                  autoComplete="tel"
                  placeholder="+91 98765 43210"
                  value={values.phone}
                  onChange={(event) => updateField("phone", event.target.value)}
                  error={errors.phone}
                  disabled={isSubmitting}
                />
              </div>

              <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                <PasswordInput
                  id="password"
                  label="Password"
                  autoComplete="new-password"
                  placeholder="Minimum 8 characters"
                  value={values.password}
                  onChange={(event) => updateField("password", event.target.value)}
                  error={errors.password}
                  disabled={isSubmitting}
                />
                <PasswordInput
                  id="confirmPassword"
                  label="Confirm password"
                  autoComplete="new-password"
                  placeholder="Repeat password"
                  value={values.confirmPassword}
                  onChange={(event) => updateField("confirmPassword", event.target.value)}
                  error={errors.confirmPassword}
                  disabled={isSubmitting}
                />
              </div>

              <RoleSelector
                value={values.role}
                onChange={(role) => updateField("role", role)}
                error={errors.role}
                disabled={isSubmitting}
              />

              <TermsCheckbox
                checked={values.acceptTerms}
                error={errors.acceptTerms}
                disabled={isSubmitting}
                onChange={(checked) => updateField("acceptTerms", checked)}
              />

              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex h-12 w-full items-center justify-center rounded-full bg-(--gw-color-green) px-6 text-sm font-semibold text-(--gw-color-cream) shadow-[0_16px_34px_rgba(26,54,45,0.22)] transition hover:bg-(--gw-color-green-soft) focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-(--gw-color-gold) disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isSubmitting ? "Creating account..." : "Create account"}
              </button>
            </form>
          ) : (
            <form className="space-y-5" onSubmit={isOtpSent ? handleVerifyOtp : handleSendOtp} noValidate>
              <AuthInput
                id="otpFullName"
                label="Full name"
                autoComplete="name"
                placeholder="Your legal name"
                value={values.fullName}
                onChange={(event) => updateField("fullName", event.target.value)}
                error={errors.fullName}
                disabled={isSubmitting}
              />

              <AuthInput
                id="otpPhone"
                label="Phone number"
                type="tel"
                autoComplete="tel"
                placeholder="+91 98765 43210"
                value={values.phone}
                onChange={(event) => updateField("phone", event.target.value)}
                error={errors.phone}
                disabled={isSubmitting || isOtpSent}
              />

              <RoleSelector
                value={values.role}
                onChange={(role) => updateField("role", role)}
                error={errors.role}
                disabled={isSubmitting}
              />

              {isOtpSent ? (
                <AuthInput
                  id="registerOtp"
                  label="OTP"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  placeholder="Enter OTP"
                  value={values.otp}
                  onChange={(event) => updateField("otp", event.target.value)}
                  error={errors.otp}
                  disabled={isSubmitting}
                />
              ) : null}

              <TermsCheckbox
                checked={values.acceptTerms}
                error={errors.acceptTerms}
                disabled={isSubmitting}
                onChange={(checked) => updateField("acceptTerms", checked)}
              />

              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex h-12 w-full items-center justify-center rounded-full bg-(--gw-color-green) px-6 text-sm font-semibold text-(--gw-color-cream) shadow-[0_16px_34px_rgba(26,54,45,0.22)] transition hover:bg-(--gw-color-green-soft) focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-(--gw-color-gold) disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isSubmitting
                  ? "Please wait..."
                  : isOtpSent
                    ? "Verify & Create Account"
                    : "Send OTP"}
              </button>
            </form>
          )}

          <div className="rounded-2xl border border-(--gw-color-border) bg-white/70 p-4">
            <RoleSelector
              value={values.role}
              onChange={(role) => updateField("role", role)}
              error={errors.role}
              disabled={isSubmitting}
            />
            <div className="mt-5">
              <SocialAuthButtons
                disabled={isSubmitting}
                submitLabel="Continue"
                onGoogle={() => handleSocialRegister("google")}
                onFacebook={() => handleSocialRegister("facebook")}
              />
            </div>
          </div>

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

function TermsCheckbox({ checked, error, disabled, onChange }) {
  return (
    <div>
      <label className="flex items-start gap-3 text-sm leading-6 text-(--gw-color-muted)">
        <input
          type="checkbox"
          checked={checked}
          onChange={(event) => onChange(event.target.checked)}
          disabled={disabled}
          className="mt-1 h-4 w-4 rounded border-(--gw-color-border) accent-(--gw-color-green)"
        />
        <span>
          I agree to GoldWallah's terms and verification requirements for my selected
          account role.
        </span>
      </label>
      {error ? (
        <p className="mt-2 text-xs font-medium text-(--gw-color-copper)">{error}</p>
      ) : null}
    </div>
  );
}
