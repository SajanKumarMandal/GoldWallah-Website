import { Link } from "react-router-dom";

import logo from "@/assets/logo.png";
import { ROUTES } from "@/constants/routes";

export default function Navbar() {
  return (
    <header className="sticky top-0 z-40 border-b border-(--gw-color-border)/80 bg-(--gw-color-cream)/90 backdrop-blur-xl">
      <div className="mx-auto flex min-h-16 max-w-7xl items-center justify-between gap-3 px-4 py-2 sm:px-6 lg:px-12">
        <Link
          to={ROUTES.home}
          className="flex min-w-0 items-center gap-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-(--gw-color-gold) sm:gap-3"
        >
          <img
            src={logo}
            alt="GoldWallah"
            loading="eager"
            decoding="async"
            className="h-9 w-9 shrink-0 rounded-full object-cover sm:h-10 sm:w-10"
          />
          <span className="truncate text-xl font-semibold text-(--gw-color-green) sm:text-2xl">
            GoldWallah
          </span>
        </Link>

        <nav aria-label="Primary navigation" className="flex shrink-0 items-center gap-1 sm:gap-3">
          <Link
            to={ROUTES.login}
            className="px-2 text-sm font-medium text-(--gw-color-green) transition hover:text-(--gw-color-green-soft) focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-(--gw-color-gold) sm:px-4"
          >
            Sign in
          </Link>
          <Link
            to={ROUTES.register}
            className="inline-flex h-9 items-center justify-center whitespace-nowrap rounded-full bg-(--gw-color-green) px-3 py-2 text-sm font-medium text-(--gw-color-cream) shadow transition hover:bg-(--gw-color-green-soft) focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-(--gw-color-gold) sm:px-5"
          >
            Get started
          </Link>
        </nav>
      </div>
    </header>
  );
}
