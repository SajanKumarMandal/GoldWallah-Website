import { ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";

import {
  loginAdmin,
  refreshAdminSession,
} from "@/features/admin/auth/services/adminAuthService";
import {
  readAdminSession,
  writeAdminSession,
} from "@/features/admin/auth/utils/adminTokenStorage";

// Admin login is intentionally separate from seller/jeweller auth because it
// uses a different backend token, refresh cookie, MFA policy, and dashboard.
export default function AdminLoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [values, setValues] = useState({ email: "", password: "", mfaCode: "" });
  const [errorMessage, setErrorMessage] = useState("");
  const [noticeMessage] = useState(location.state?.message || "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  // If no in-memory admin token exists, try restoring from the backend-owned
  // HttpOnly refresh cookie before showing the login form.
  const [isRestoringSession, setIsRestoringSession] = useState(!readAdminSession());
  const existingSession = readAdminSession();

  useEffect(() => {
    let isMounted = true;

    async function restoreCookieSession() {
      // Existing in-memory sessions do not need a cookie refresh.
      if (existingSession?.accessToken) {
        setIsRestoringSession(false);
        return;
      }

      try {
        // Refresh endpoint rotates the admin refresh cookie and returns a fresh
        // short-lived admin access token.
        const result = await refreshAdminSession();
        const data = result?.data || {};

        if (!data.admin || !data.accessToken) {
          throw new Error("Admin session refresh failed");
        }

        writeAdminSession({
          admin: data.admin,
          accessToken: data.accessToken,
        });

        if (isMounted) {
          // Temporary-password admins must change password before dashboard access.
          navigate(
            data.admin?.mustChangePassword
              ? "/admin/change-password"
              : location.state?.from?.pathname || "/admin/dashboard",
            { replace: true },
          );
        }
      } catch {
        if (isMounted) {
          setIsRestoringSession(false);
        }
      }
    }

    restoreCookieSession();

    return () => {
      isMounted = false;
    };
  }, [existingSession?.accessToken, location.state?.from?.pathname, navigate]);

  if (existingSession?.accessToken) {
    // Already-authenticated admins skip the login form.
    return (
      <Navigate
        to={
          existingSession.admin?.mustChangePassword
            ? "/admin/change-password"
            : "/admin/dashboard"
        }
        replace
      />
    );
  }

  if (isRestoringSession) {
    // Hold the page while refresh-cookie restoration is in flight.
    return (
      <div className="flex min-h-screen items-center justify-center bg-(--gw-color-green) text-(--gw-color-cream)">
        Verifying admin session...
      </div>
    );
  }

  function updateField(name, value) {
    // Clear visible login errors as soon as the admin edits any credential field.
    setValues((currentValues) => ({ ...currentValues, [name]: value }));
    setErrorMessage("");
  }

  async function handleSubmit(event) {
    // Submit email/password and optional MFA code to the admin auth endpoint.
    event.preventDefault();

    if (!values.email.trim() || !values.password) {
      setErrorMessage("Email and password are required.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage("");

    try {
      // Store admin access token in memory only; refresh stays HttpOnly server-side.
      const result = await loginAdmin({
        email: values.email.trim(),
        password: values.password,
        mfaCode: values.mfaCode.trim(),
      });
      const data = result?.data || {};

      writeAdminSession({
        admin: data.admin,
        accessToken: data.accessToken,
      });

      navigate(
        data.admin?.mustChangePassword
          ? "/admin/change-password"
          : location.state?.from?.pathname || "/admin/dashboard",
        { replace: true },
      );
    } catch (error) {
      setErrorMessage(error.message || "Unable to login.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen min-w-0 bg-(--gw-color-green) px-4 py-8 text-(--gw-color-cream) sm:px-6 lg:px-8">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-6xl items-center">
        <div className="grid w-full min-w-0 gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(22rem,28rem)] lg:items-center">
          <section className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-(--gw-color-gold) sm:tracking-[0.28em]">
              GoldWallah Admin
            </p>
            <h1 className="gw-break-text gw-text-section mt-4 max-w-3xl font-semibold leading-tight">
              Secure operations console for verification, risk, and finance.
            </h1>
            <p className="gw-text-body mt-5 max-w-2xl leading-7 text-white/70">
              Admin access is separated from seller and jeweller accounts. Use only
              your assigned admin credentials.
            </p>
          </section>

          <form
            className="min-w-0 rounded-3xl border border-white/15 bg-(--gw-color-cream) p-5 text-(--gw-color-green) shadow-[0_30px_90px_rgba(0,0,0,0.28)] sm:p-6"
            onSubmit={handleSubmit}
            noValidate
          >
            <div className="flex items-center gap-3">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-(--gw-color-green) text-(--gw-color-gold)">
                <ShieldCheck className="h-6 w-6" aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <p className="truncate text-xs font-semibold uppercase tracking-[0.16em] text-(--gw-color-muted) sm:tracking-[0.2em]">
                  Admin login
                </p>
                <h2 className="gw-break-text text-xl font-semibold">Sign in</h2>
              </div>
            </div>

            {noticeMessage ? (
              <p className="mt-5 rounded-2xl bg-(--gw-color-gold)/12 px-4 py-3 text-sm font-medium text-(--gw-color-green)">
                {noticeMessage}
              </p>
            ) : null}

            {errorMessage ? (
              <p className="mt-5 rounded-2xl bg-(--gw-color-copper)/10 px-4 py-3 text-sm font-medium text-(--gw-color-copper)">
                {errorMessage}
              </p>
            ) : null}

            <label className="mt-6 block" htmlFor="admin-email">
              <span className="text-sm font-semibold">Email</span>
              <input
                id="admin-email"
                type="email"
                value={values.email}
                autoComplete="username"
                disabled={isSubmitting}
                onChange={(event) => updateField("email", event.target.value)}
                className="mt-2 h-12 w-full rounded-2xl border border-(--gw-color-border) bg-white px-4 text-sm outline-none transition focus:border-(--gw-color-gold) focus:ring-4 focus:ring-(--gw-color-gold)/15 disabled:cursor-not-allowed disabled:opacity-70"
              />
            </label>

            <label className="mt-5 block" htmlFor="admin-password">
              <span className="text-sm font-semibold">Password</span>
              <input
                id="admin-password"
                type="password"
                value={values.password}
                autoComplete="current-password"
                disabled={isSubmitting}
                onChange={(event) => updateField("password", event.target.value)}
                className="mt-2 h-12 w-full rounded-2xl border border-(--gw-color-border) bg-white px-4 text-sm outline-none transition focus:border-(--gw-color-gold) focus:ring-4 focus:ring-(--gw-color-gold)/15 disabled:cursor-not-allowed disabled:opacity-70"
              />
            </label>

            <label className="mt-5 block" htmlFor="admin-mfa-code">
              <span className="text-sm font-semibold">MFA code</span>
              <input
                id="admin-mfa-code"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                value={values.mfaCode}
                autoComplete="one-time-code"
                disabled={isSubmitting}
                onChange={(event) =>
                  updateField("mfaCode", event.target.value.replace(/\D/g, ""))
                }
                className="mt-2 h-12 w-full rounded-2xl border border-(--gw-color-border) bg-white px-4 text-sm outline-none transition focus:border-(--gw-color-gold) focus:ring-4 focus:ring-(--gw-color-gold)/15 disabled:cursor-not-allowed disabled:opacity-70"
              />
            </label>

            <button
              type="submit"
              disabled={isSubmitting}
              className="mt-6 inline-flex h-12 w-full items-center justify-center rounded-full bg-(--gw-color-green) px-5 text-sm font-semibold text-(--gw-color-cream) shadow-[0_16px_34px_rgba(26,54,45,0.2)] transition hover:bg-(--gw-color-green-soft) disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isSubmitting ? "Signing in..." : "Sign in to admin"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
