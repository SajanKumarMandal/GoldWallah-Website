import { KeyRound, ShieldAlert } from "lucide-react";
import { useMemo, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";

import {
  changeAdminPassword,
} from "@/features/admin/auth/services/adminAuthService";
import {
  clearAdminSession,
  readAdminSession,
} from "@/features/admin/auth/utils/adminTokenStorage";

function passwordChecks(password) {
  // Frontend strength checklist mirrors backend admin-password requirements for
  // immediate feedback before submission.
  return [
    { label: "At least 12 characters", passed: password.length >= 12 },
    { label: "Contains uppercase and lowercase letters", passed: /[A-Z]/.test(password) && /[a-z]/.test(password) },
    { label: "Contains a number", passed: /\d/.test(password) },
    { label: "Contains a symbol", passed: /[^A-Za-z0-9]/.test(password) },
  ];
}

// Forced password-change screen for seeded or reset admin accounts.
export default function AdminChangePasswordPage() {
  const navigate = useNavigate();
  const session = readAdminSession();
  const [values, setValues] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  // Recompute strength checks only when the proposed new password changes.
  const checks = useMemo(
    () => passwordChecks(values.newPassword),
    [values.newPassword],
  );

  if (!session?.accessToken) {
    // Password change is protected by the in-memory admin access token.
    return <Navigate to="/admin/login" replace />;
  }

  function updateField(name, value) {
    // Clear stale validation errors while the admin edits password fields.
    setValues((currentValues) => ({ ...currentValues, [name]: value }));
    setErrorMessage("");
  }

  function validate() {
    // Client-side validation avoids unnecessary auth calls; backend still
    // enforces the same password policy.
    if (!values.currentPassword || !values.newPassword || !values.confirmPassword) {
      return "All password fields are required.";
    }

    if (values.currentPassword === values.newPassword) {
      return "New password must be different from current password.";
    }

    if (values.newPassword !== values.confirmPassword) {
      return "New password and confirmation do not match.";
    }

    if (!checks.every((check) => check.passed)) {
      return "New password does not meet the strength requirements.";
    }

    return "";
  }

  async function handleSubmit(event) {
    // After a successful password change, force a fresh admin login so old
    // temporary-password sessions cannot continue.
    event.preventDefault();
    const validationError = validate();

    if (validationError) {
      setErrorMessage(validationError);
      return;
    }

    setIsSubmitting(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      await changeAdminPassword(session.accessToken, {
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      });
      clearAdminSession();
      setSuccessMessage("Password changed successfully. Please login again.");
      setTimeout(() => {
        navigate("/admin/login", {
          replace: true,
          state: { message: "Password changed successfully. Please login again." },
        });
      }, 900);
    } catch (error) {
      setErrorMessage(error.message || "Unable to change password.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen min-w-0 bg-(--gw-color-green) px-4 py-8 text-(--gw-color-cream) sm:px-6 lg:px-8">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-5xl items-center justify-center">
        <form
          className="w-full min-w-0 max-w-xl rounded-3xl border border-white/15 bg-(--gw-color-cream) p-5 text-(--gw-color-green) shadow-[0_30px_90px_rgba(0,0,0,0.28)] sm:p-6"
          onSubmit={handleSubmit}
          noValidate
        >
          <div className="flex items-start gap-3">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-(--gw-color-green) text-(--gw-color-gold)">
              <KeyRound className="h-6 w-6" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-xs font-semibold uppercase tracking-[0.16em] text-(--gw-color-muted) sm:tracking-[0.2em]">
                Admin password
              </p>
              <h1 className="gw-break-text mt-1 text-xl font-semibold sm:text-2xl">
                Change temporary password
              </h1>
              <p className="gw-break-text mt-2 text-sm leading-6 text-(--gw-color-muted)">
                Password change is required before accessing the admin dashboard.
              </p>
            </div>
          </div>

          {errorMessage ? (
            <p className="mt-5 rounded-2xl bg-(--gw-color-copper)/10 px-4 py-3 text-sm font-medium text-(--gw-color-copper)">
              {errorMessage}
            </p>
          ) : null}

          {successMessage ? (
            <p className="mt-5 rounded-2xl bg-(--gw-color-gold)/12 px-4 py-3 text-sm font-medium text-(--gw-color-green)">
              {successMessage}
            </p>
          ) : null}

          <PasswordField
            id="currentPassword"
            label="Current password"
            value={values.currentPassword}
            disabled={isSubmitting}
            onChange={(value) => updateField("currentPassword", value)}
          />
          <PasswordField
            id="newPassword"
            label="New password"
            value={values.newPassword}
            disabled={isSubmitting}
            onChange={(value) => updateField("newPassword", value)}
          />
          <PasswordField
            id="confirmPassword"
            label="Confirm new password"
            value={values.confirmPassword}
            disabled={isSubmitting}
            onChange={(value) => updateField("confirmPassword", value)}
          />

          <div className="mt-5 rounded-2xl border border-(--gw-color-border) bg-white p-4">
            <div className="flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-(--gw-color-gold)" aria-hidden="true" />
              <p className="text-sm font-semibold">Password strength</p>
            </div>
            <ul className="mt-3 space-y-2">
              {checks.map((check) => (
                <li
                  key={check.label}
                  className={`text-xs font-medium ${
                    check.passed ? "text-(--gw-color-green)" : "text-(--gw-color-muted)"
                  }`}
                >
                  {check.passed ? "Pass:" : "Pending:"} {check.label}
                </li>
              ))}
            </ul>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="mt-6 inline-flex h-12 w-full items-center justify-center rounded-full bg-(--gw-color-green) px-5 text-sm font-semibold text-(--gw-color-cream) shadow-[0_16px_34px_rgba(26,54,45,0.2)] transition hover:bg-(--gw-color-green-soft) disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isSubmitting ? "Changing password..." : "Change password"}
          </button>
        </form>
      </div>
    </div>
  );
}

function PasswordField({ id, label, value, onChange, disabled }) {
  // Local password input wrapper used for current/new/confirmation fields.
  return (
    <label className="mt-5 block" htmlFor={id}>
      <span className="text-sm font-semibold">{label}</span>
      <input
        id={id}
        type="password"
        value={value}
        autoComplete="new-password"
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 h-12 w-full rounded-2xl border border-(--gw-color-border) bg-white px-4 text-sm outline-none transition focus:border-(--gw-color-gold) focus:ring-4 focus:ring-(--gw-color-gold)/15 disabled:cursor-not-allowed disabled:opacity-70"
      />
    </label>
  );
}
