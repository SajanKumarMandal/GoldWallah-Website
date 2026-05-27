import logo from "@/assets/logo.png";
import { footerGroups } from "@/features/landing/constants/landingContent";

export default function Footer() {
  return (
    <footer className="border-t border-(--gw-color-border) bg-[#f7f5f1] px-6 py-12 lg:px-12">
      <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-12">
        <div className="lg:col-span-4">
          <div className="flex items-center gap-3">
            <img
              src={logo}
              alt="GoldWallah"
              className="h-11 w-11 rounded-full object-cover"
            />
            <span className="text-2xl font-semibold text-(--gw-color-green)">
              GoldWallah
            </span>
          </div>
          <p className="mt-5 max-w-sm text-sm leading-relaxed text-(--gw-color-muted)">
            A verification-first gold marketplace for sellers and jewellers,
            designed around private bidding, local matching, and secure trade.
          </p>
          <p className="mt-6 text-sm text-(--gw-color-muted)">
            Contact: support@goldwallah.example
          </p>
        </div>

        <div className="grid gap-8 sm:grid-cols-2 lg:col-span-8 lg:grid-cols-4">
          {footerGroups.map(({ title, links }) => (
            <div key={title}>
              <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-(--gw-color-green)">
                {title}
              </h3>
              <ul className="mt-4 space-y-3">
                {links.map((link) => (
                  <li key={link}>
                    <a
                      href="#top"
                      className="text-sm text-(--gw-color-muted) transition hover:text-(--gw-color-green) focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-(--gw-color-gold)"
                    >
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      <div className="mx-auto mt-10 flex max-w-7xl flex-col gap-3 border-t border-(--gw-color-border) pt-6 text-sm text-(--gw-color-muted) sm:flex-row sm:items-center sm:justify-between">
        <span>© 2026 GoldWallah. All rights reserved.</span>
        <span>LinkedIn · X · Instagram</span>
      </div>
    </footer>
  );
}
