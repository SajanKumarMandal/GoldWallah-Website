import { ShieldCheck } from "lucide-react";
import { useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";

import { loginAdmin } from "@/features/admin/auth/services/adminAuthService";
import {
  readAdminSession,
  writeAdminSession,
} from "@/features/admin/auth/utils/adminTokenStorage";

export default function AdminLoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [values, setValues] = useState({ email: "", password: "" });
  const [errorMessage, setErrorMessage] = useState("");
  const [noticeMessage] = useState(location.state?.message || "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const existingSession = readAdminSession();

  if (existingSession?.accessToken) {
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

  function updateField(name, value) {
    setValues((currentValues) => ({ ...currentValues, [name]: value }));
    setErrorMessage("");
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (!values.email.trim() || !values.password) {
      setErrorMessage("Email and password are required.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage("");

    try {
      const result = await loginAdmin({
        email: values.email.trim(),
        password: values.password,
      });
      const data = result?.data || {};

      writeAdminSession({
        admin: data.admin,
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
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
    <div className="min-h-screen bg-(--gw-color-green) px-4 py-8 text-(--gw-color-cream)">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-6xl items-center">
        <div className="grid w-full gap-8 lg:grid-cols-[1fr_28rem] lg:items-center">
          <section>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-(--gw-color-gold)">
              GoldWallah Admin
            </p>
            <h1 className="mt-4 max-w-3xl text-4xl font-semibold leading-tight sm:text-5xl">
              Secure operations console for verification, risk, and finance.
            </h1>
            <p className="mt-5 max-w-2xl text-sm leading-7 text-white/70">
              Admin access is separated from seller and jeweller accounts. Use only
              your assigned admin credentials.
            </p>
          </section>

          <form
            className="rounded-3xl border border-white/15 bg-(--gw-color-cream) p-6 text-(--gw-color-green) shadow-[0_30px_90px_rgba(0,0,0,0.28)]"
            onSubmit={handleSubmit}
            noValidate
          >
            <div className="flex items-center gap-3">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-(--gw-color-green) text-(--gw-color-gold)">
                <ShieldCheck className="h-6 w-6" aria-hidden="true" />
              </span>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-(--gw-color-muted)">
                  Admin login
                </p>
                <h2 className="text-xl font-semibold">Sign in</h2>
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
