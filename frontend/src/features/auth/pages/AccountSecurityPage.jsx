import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { ROUTES } from "@/constants/routes";
import PasswordInput from "@/features/auth/components/PasswordInput";
import { useAuth } from "@/features/auth/context/useAuth";
import {
  changePassword,
  logoutAllDevices,
  sendEmailVerification,
} from "@/features/auth/services/authService";
import { validateChangePasswordForm } from "@/features/auth/utils/authValidation";

const initialPasswordValues = {
  currentPassword: "",
  newPassword: "",
};

export default function AccountSecurityPage() {
  const { user, accessToken, clearAuthUser } = useAuth();
  const navigate = useNavigate();
  const [passwordValues, setPasswordValues] = useState(initialPasswordValues);
  const [errors, setErrors] = useState({});
  const [statusMessage, setStatusMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);

  function updatePasswordField(field, value) {
    setPasswordValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: "" }));
    setStatusMessage("");
  }

  async function handlePasswordChange(event) {
    event.preventDefault();
    const nextErrors = validateChangePasswordForm(passwordValues);
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await changePassword(accessToken, passwordValues);
      setPasswordValues(initialPasswordValues);
      setStatusMessage(result?.message || "Password changed successfully.");
    } catch (error) {
      setStatusMessage(error.message || "Password could not be changed.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleSendVerification() {
    setIsSendingEmail(true);
    setStatusMessage("");

    try {
      const result = await sendEmailVerification(accessToken);
      setStatusMessage(result?.message || "Verification email sent.");
    } catch (error) {
      setStatusMessage(error.message || "Verification email could not be sent.");
    } finally {
      setIsSendingEmail(false);
    }
  }

  async function handleLogoutAll() {
    setIsSubmitting(true);

    try {
      await logoutAllDevices(accessToken);
    } catch {
      // Local cleanup still happens if the current server session is stale.
    } finally {
      clearAuthUser();
      navigate(ROUTES.login, { replace: true });
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <section className="rounded-2xl border border-(--gw-color-border) bg-white p-5">
        <h1 className="text-xl font-semibold text-(--gw-color-green)">Account security</h1>
        <p className="mt-2 text-sm leading-6 text-(--gw-color-muted)">
          Manage password access, verification, and active sessions.
        </p>
      </section>

      {user?.email && !user?.isEmailVerified ? (
        <section className="rounded-2xl border border-(--gw-color-gold)/40 bg-(--gw-color-gold)/10 p-5">
          <h2 className="font-semibold text-(--gw-color-green)">Verify your email</h2>
          <p className="mt-2 text-sm leading-6 text-(--gw-color-muted)">
            Email verification improves account recovery and marketplace communications.
          </p>
          <button
            type="button"
            onClick={handleSendVerification}
            disabled={isSendingEmail}
            className="mt-4 inline-flex h-10 items-center justify-center rounded-full bg-(--gw-color-green) px-5 text-sm font-semibold text-(--gw-color-cream) disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isSendingEmail ? "Sending..." : "Send verification email"}
          </button>
        </section>
      ) : null}

      {!user?.isPhoneVerified ? (
        <section className="rounded-2xl border border-(--gw-color-border) bg-white p-5">
          <h2 className="font-semibold text-(--gw-color-green)">Verify your phone</h2>
          <p className="mt-2 text-sm leading-6 text-(--gw-color-muted)">
            Phone verification uses GoldWallah OTP delivery and protects account ownership.
          </p>
          <Link
            to={ROUTES.phoneVerification}
            className="mt-4 inline-flex h-10 items-center justify-center rounded-full border border-(--gw-color-border) px-5 text-sm font-semibold text-(--gw-color-green)"
          >
            Verify phone
          </Link>
        </section>
      ) : null}

      <section className="rounded-2xl border border-(--gw-color-border) bg-white p-5">
        <h2 className="font-semibold text-(--gw-color-green)">Change password</h2>
        <form className="mt-5 space-y-5" onSubmit={handlePasswordChange} noValidate>
          <PasswordInput
            id="currentPassword"
            label="Current password"
            autoComplete="current-password"
            value={passwordValues.currentPassword}
            onChange={(event) => updatePasswordField("currentPassword", event.target.value)}
            error={errors.currentPassword}
            disabled={isSubmitting}
          />
          <PasswordInput
            id="newPassword"
            label="New password"
            autoComplete="new-password"
            value={passwordValues.newPassword}
            onChange={(event) => updatePasswordField("newPassword", event.target.value)}
            error={errors.newPassword}
            disabled={isSubmitting}
          />
          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex h-11 items-center justify-center rounded-full bg-(--gw-color-green) px-5 text-sm font-semibold text-(--gw-color-cream) disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isSubmitting ? "Saving..." : "Change password"}
          </button>
        </form>
      </section>

      <section className="rounded-2xl border border-(--gw-color-border) bg-white p-5">
        <h2 className="font-semibold text-(--gw-color-green)">Sessions</h2>
        <p className="mt-2 text-sm leading-6 text-(--gw-color-muted)">
          End every active refresh session for this account.
        </p>
        <button
          type="button"
          onClick={handleLogoutAll}
          disabled={isSubmitting}
          className="mt-4 inline-flex h-10 items-center justify-center rounded-full bg-(--gw-color-copper) px-5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-70"
        >
          Logout from all devices
        </button>
      </section>

      {statusMessage ? (
        <p className="rounded-2xl bg-(--gw-color-gold)/12 px-4 py-3 text-sm text-(--gw-color-green)">
          {statusMessage}
        </p>
      ) : null}
    </div>
  );
}
