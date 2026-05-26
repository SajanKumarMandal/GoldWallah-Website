import { Link } from "react-router-dom";

import { ROUTES } from "@/constants/routes";

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-(--gw-color-cream) px-6 text-center">
      <div className="max-w-md">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-(--gw-color-copper)">
          404
        </p>
        <h1 className="mt-4 text-4xl font-semibold text-(--gw-color-green)">
          Page not found
        </h1>
        <p className="mt-4 text-(--gw-color-muted)">
          The page you are looking for is not available.
        </p>
        <Link
          to={ROUTES.home}
          className="mt-8 inline-flex rounded-full bg-(--gw-color-green) px-6 py-3 text-sm font-medium text-white transition hover:bg-(--gw-color-green-soft)"
        >
          Go home
        </Link>
      </div>
    </main>
  );
}
