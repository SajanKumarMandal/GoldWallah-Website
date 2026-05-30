import { Menu, ShieldCheck } from "lucide-react";

export default function AdminTopbar({ admin, onMenuClick }) {
  return (
    <header className="sticky top-0 z-20 border-b border-(--gw-color-border)/70 bg-(--gw-color-cream)/90 backdrop-blur-xl">
      <div className="flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onMenuClick}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-(--gw-color-green) shadow-sm lg:hidden"
            aria-label="Open admin menu"
          >
            <Menu className="h-5 w-5" aria-hidden="true" />
          </button>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-(--gw-color-muted)">
              Admin console
            </p>
            <p className="text-sm font-semibold text-(--gw-color-green)">
              Dashboard
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 rounded-full border border-(--gw-color-border) bg-white py-1 pl-1 pr-4">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-(--gw-color-green) text-(--gw-color-gold)">
            <ShieldCheck className="h-4 w-4" aria-hidden="true" />
          </span>
          <div className="hidden sm:block">
            <p className="text-sm font-semibold text-(--gw-color-green)">
              {admin?.name || "Admin"}
            </p>
            <p className="text-xs text-(--gw-color-muted)">
              {admin?.isSuperAdmin ? "Super admin" : "Admin"}
            </p>
          </div>
        </div>
      </div>
    </header>
  );
}
