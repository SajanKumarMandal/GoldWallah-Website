import { useState } from "react";
import { Link } from "react-router-dom";

import { ROUTES } from "@/constants/routes";
import AuthCard from "@/features/auth/components/AuthCard";
import AuthInput from "@/features/auth/components/AuthInput";
import AuthLayout from "@/features/auth/components/AuthLayout";
import { forgotPassword } from "@/features/auth/services/authService";
import { validateForgotPasswordForm } from "@/features/auth/utils/authValidation";

export default function ForgotPasswordPage() {
  const [values, setValues] = useState({ email: "" });
  const [errors, setErrors] = useState({});
  const [statusMessage, setStatusMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    const nextErrors = validateForgotPasswordForm(values);
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    setIsSubmitting(true);
    setStatusMessage("");

    try {
      const result = await forgotPassword({ email: values.email.trim() });
      setStatusMessage(result?.message || "If an account exists, reset instructions will be sent.");
    } catch {
      setStatusMessage("If an account exists, reset instructions will be sent.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthLayout
      eyebrow="Password recovery"
      title="Reset access without exposing account status."
      description="GoldWallah sends reset instructions only through verified backend email delivery."
    >
      <AuthCard
        title="Forgot password"
        description="Enter your account email. The response is intentionally generic for account privacy."
        footer={
          <Link
            to={ROUTES.login}
            className="font-semibold text-(--gw-color-green) underline decoration-(--gw-color-gold)/55 underline-offset-4"
          >
            Back to sign in
          </Link>
        }
      >
        <form className="space-y-5" onSubmit={handleSubmit} noValidate>
          <AuthInput
            id="forgotEmail"
            label="Email"
            type="email"
            autoComplete="email"
            value={values.email}
            onChange={(event) => {
              setValues({ email: event.target.value });
              setErrors({});
              setStatusMessage("");
            }}
            error={errors.email}
            disabled={isSubmitting}
          />
          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex h-12 w-full items-center justify-center rounded-full bg-(--gw-color-green) px-6 text-sm font-semibold text-(--gw-color-cream) transition hover:bg-(--gw-color-green-soft) disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isSubmitting ? "Sending..." : "Send reset instructions"}
          </button>
        </form>
        {statusMessage ? (
          <p className="mt-5 rounded-2xl bg-(--gw-color-gold)/12 px-4 py-3 text-sm text-(--gw-color-green)">
            {statusMessage}
          </p>
        ) : null}
      </AuthCard>
    </AuthLayout>
  );
}

