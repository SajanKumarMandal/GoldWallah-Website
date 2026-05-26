import { Link } from "react-router-dom";

import { ROUTES } from "@/constants/routes";

export default function LoginPage() {
  return (
    <section className="mx-auto flex min-h-[calc(100vh-118px)] max-w-md flex-col justify-center px-6 py-16">
      <p className="text-xs font-medium uppercase tracking-[0.25em] text-(--gw-color-copper)">
        Secure access
      </p>
      <h1 className="mt-4 text-4xl font-semibold text-(--gw-color-green)">
        Sign in to GoldWallah
      </h1>
      <p className="mt-4 text-(--gw-color-muted)">
        Authentication will use short-lived access tokens, refresh rotation, and
        role-aware sessions.
      </p>
      <Link
        to={ROUTES.register}
        className="mt-8 inline-flex justify-center rounded-full bg-(--gw-color-green) px-6 py-3 text-sm font-medium text-white transition hover:bg-(--gw-color-green-soft)"
      >
        Create account
      </Link>
    </section>
  );
}
