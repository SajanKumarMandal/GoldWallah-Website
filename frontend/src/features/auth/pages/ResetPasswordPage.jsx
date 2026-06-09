import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";

import { ROUTES } from "@/constants/routes";
import AuthCard from "@/features/auth/components/AuthCard";
import AuthInput from "@/features/auth/components/AuthInput";
import AuthLayout from "@/features/auth/components/AuthLayout";
import PasswordInput from "@/features/auth/components/PasswordInput";
import { resetPassword } from "@/features/auth/services/authService";
import { validateResetPasswordForm } from "@/features/auth/utils/authValidation";

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const initialToken = useMemo(() => searchParams.get("token") || "", [searchParams]);
  const [values, setValues] = useState({
    token: initialToken,
    newPassword: "",
    confirmPassword: "",
  });
  const [errors, setErrors] = useState({});
  const [statusMessage, setStatusMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isComplete, setIsComplete] = useState(false);

  function updateField(field, value) {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: "" }));
    setStatusMessage("");
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const nextErrors = validateResetPasswordForm(values);
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await resetPassword({
        token: values.token.trim(),
        newPassword: values.newPassword,
      });
      setIsComplete(true);
      setStatusMessage(result?.message || "Password reset successfully.");
    } catch (error) {
      setStatusMessage(error.message || "Reset link is invalid or expired.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthLayout
      eyebrow="Secure reset"
      title="Create a new account password."
      description="Reset links are short-lived, single-use, and never stored in plain text."
    >
      <AuthCard
        title="Reset password"
        description="Choose a new password that meets GoldWallah security requirements."
        footer={
          <Link
            to={ROUTES.login}
            className="font-semibold text-(--gw-color-green) underline decoration-(--gw-color-gold)/55 underline-offset-4"
          >
            Return to sign in
          </Link>
        }
      >
        <form className="space-y-5" onSubmit={handleSubmit} noValidate>
          {!initialToken ? (
            <AuthInput
              id="resetToken"
              label="Reset token"
              autoComplete="off"
              value={values.token}
              onChange={(event) => updateField("token", event.target.value)}
              error={errors.token}
              disabled={isSubmitting || isComplete}
            />
          ) : null}
          <PasswordInput
            id="resetNewPassword"
            label="New password"
            autoComplete="new-password"
            value={values.newPassword}
            onChange={(event) => updateField("newPassword", event.target.value)}
            error={errors.newPassword}
            disabled={isSubmitting || isComplete}
          />
          <PasswordInput
            id="resetConfirmPassword"
            label="Confirm password"
            autoComplete="new-password"
            value={values.confirmPassword}
            onChange={(event) => updateField("confirmPassword", event.target.value)}
            error={errors.confirmPassword}
            disabled={isSubmitting || isComplete}
          />
          <button
            type="submit"
            disabled={isSubmitting || isComplete}
            className="inline-flex h-12 w-full items-center justify-center rounded-full bg-(--gw-color-green) px-6 text-sm font-semibold text-(--gw-color-cream) transition hover:bg-(--gw-color-green-soft) disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isSubmitting ? "Resetting..." : "Reset password"}
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

