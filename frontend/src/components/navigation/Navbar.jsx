import { Link } from "react-router-dom";

import logo from "@/assets/logo.png";
import { ROUTES } from "@/constants/routes";

export default function Navbar() {
  return (
    <header className="sticky top-0 z-40 border-b border-(--gw-color-border)/80 bg-(--gw-color-cream)/90 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6 lg:px-12">
        <Link
          to={ROUTES.home}
          className="flex items-center gap-3 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-(--gw-color-gold)"
        >
          <img
            src={logo}
            alt="GoldWallah"
            className="h-10 w-10 rounded-full object-cover"
          />
          <span className="text-2xl font-semibold text-(--gw-color-green)">
            GoldWallah
          </span>
        </Link>

        <nav aria-label="Primary navigation" className="flex items-center gap-3">
          <Link
            to={ROUTES.login}
            className="px-4 text-sm font-medium text-(--gw-color-green) transition hover:text-(--gw-color-green-soft) focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-(--gw-color-gold)"
          >
            Sign in
          </Link>
          <Link
            to={ROUTES.register}
            className="inline-flex h-9 items-center justify-center rounded-full bg-(--gw-color-green) px-5 py-2 text-sm font-medium text-(--gw-color-cream) shadow transition hover:bg-(--gw-color-green-soft) focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-(--gw-color-gold)"
          >
            Get started
          </Link>
        </nav>
      </div>
    </header>
  );
}
