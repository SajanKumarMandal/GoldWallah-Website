import { Link } from "react-router-dom";

import { ROUTES } from "@/constants/routes";

export default function NotFound() {
  return (
<main className="flex min-h-screen min-w-0 items-center justify-center bg-(--gw-color-cream) px-4 text-center sm:px-6">
  <div className="max-w-md min-w-0">
    <p className="text-sm font-medium uppercase tracking-[0.18em] text-(--gw-color-copper) sm:tracking-[0.2em]">
      Coming Soon
    </p>
    <h1 className="gw-break-text gw-text-section mt-4 font-semibold text-(--gw-color-green)">
      We're building this page
    </h1>
    <p className="mt-4 text-(--gw-color-muted)">
      This page is still under development. We're working on it and it will be
      available soon. Thank you for your patience.
    </p>
    <Link
      to={ROUTES.home}
      className="mt-8 inline-flex rounded-full bg-(--gw-color-green) px-6 py-3 text-sm font-medium text-white transition hover:bg-(--gw-color-green-soft)"
    >
      Back to home
    </Link>
  </div>
</main>
  );
}
