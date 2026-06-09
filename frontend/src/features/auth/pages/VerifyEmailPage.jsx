import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";

import { ROUTES } from "@/constants/routes";
import AuthCard from "@/features/auth/components/AuthCard";
import AuthInput from "@/features/auth/components/AuthInput";
import AuthLayout from "@/features/auth/components/AuthLayout";
import { verifyEmailToken } from "@/features/auth/services/authService";

export default function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const initialToken = useMemo(() => searchParams.get("token") || "", [searchParams]);
  const [token, setToken] = useState(initialToken);
  const [statusMessage, setStatusMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(Boolean(initialToken));
  const [isComplete, setIsComplete] = useState(false);

  async function submitToken(nextToken) {
    if (!nextToken.trim()) {
      setStatusMessage("Verification token is required.");
      return;
    }

    setIsSubmitting(true);
    setStatusMessage("");

    try {
      const result = await verifyEmailToken({ token: nextToken.trim() });
      setIsComplete(true);
      setStatusMessage(result?.message || "Email verified successfully.");
    } catch (error) {
      setStatusMessage(error.message || "Verification link is invalid or expired.");
    } finally {
      setIsSubmitting(false);
    }
  }

  useEffect(() => {
    if (initialToken) {
      const timerId = window.setTimeout(() => submitToken(initialToken), 0);
      return () => window.clearTimeout(timerId);
    }

    return undefined;
  }, [initialToken]);

  function handleSubmit(event) {
    event.preventDefault();
    submitToken(token);
  }

  return (
    <AuthLayout
      eyebrow="Email verification"
      title="Confirm your GoldWallah email."
      description="Email verification helps protect account recovery and marketplace communications."
    >
      <AuthCard
        title="Verify email"
        description="Open the verification link from your email or paste the token below."
        footer={
          <Link
            to={ROUTES.login}
            className="font-semibold text-(--gw-color-green) underline decoration-(--gw-color-gold)/55 underline-offset-4"
          >
            Go to sign in
          </Link>
        }
      >
        {!initialToken ? (
          <form className="space-y-5" onSubmit={handleSubmit} noValidate>
            <AuthInput
              id="emailVerificationToken"
              label="Verification token"
              autoComplete="off"
              value={token}
              onChange={(event) => {
                setToken(event.target.value);
                setStatusMessage("");
              }}
              disabled={isSubmitting || isComplete}
            />
            <button
              type="submit"
              disabled={isSubmitting || isComplete}
              className="inline-flex h-12 w-full items-center justify-center rounded-full bg-(--gw-color-green) px-6 text-sm font-semibold text-(--gw-color-cream) transition hover:bg-(--gw-color-green-soft) disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isSubmitting ? "Verifying..." : "Verify email"}
            </button>
          </form>
        ) : null}
        {statusMessage ? (
          <p className="rounded-2xl bg-(--gw-color-gold)/12 px-4 py-3 text-sm text-(--gw-color-green)">
            {statusMessage}
          </p>
        ) : null}
      </AuthCard>
    </AuthLayout>
  );
}
