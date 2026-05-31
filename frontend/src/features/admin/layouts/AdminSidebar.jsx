import {
  AlertTriangle,
  BarChart3,
  FileCheck2,
  ReceiptIndianRupee,
  LogOut,
  Shield,
  UsersRound,
  X,
} from "lucide-react";
import { Link, useLocation } from "react-router-dom";

const navItems = [
  {
    to: "/admin/dashboard",
    label: "Dashboard",
    icon: BarChart3,
    permission: "admin.dashboard.view",
  },
  {
    to: "/admin/kyc",
    label: "Seller KYC",
    icon: FileCheck2,
    permission: "admin.kyc.seller.view",
    disabled: true,
  },
  {
    to: "/admin/commissions",
    label: "Commissions",
    icon: ReceiptIndianRupee,
    permission: "admin.commissions.view",
  },
  {
    to: "/admin/sub-admins",
    label: "Sub-admins",
    icon: UsersRound,
    permission: "admin.subadmins.view",
    disabled: true,
  },
  {
    to: "/admin/audit",
    label: "Audit logs",
    icon: AlertTriangle,
    permission: "admin.audit.view",
    disabled: true,
  },
];

function hasPermission(admin, permission) {
  return admin?.isSuperAdmin || admin?.permissions?.includes(permission);
}

export default function AdminSidebar({ admin, onLogout, onClose }) {
  const location = useLocation();
  const visibleItems = navItems.filter((item) => hasPermission(admin, item.permission));

  return (
    <div className="flex h-full min-w-0 flex-col bg-(--gw-color-green) px-4 py-5 text-(--gw-color-cream)">
      <div className="flex min-w-0 items-center justify-between gap-3">
        <Link to="/admin/dashboard" className="flex min-w-0 items-center gap-3" onClick={onClose}>
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-(--gw-color-gold) text-(--gw-color-green)">
            <Shield className="h-6 w-6" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <p className="truncate text-lg font-semibold">GoldWallah</p>
            <p className="text-xs uppercase tracking-[0.2em] text-white/55">
              Admin
            </p>
          </div>
        </Link>
        {onClose ? (
          <button
            type="button"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 lg:hidden"
            onClick={onClose}
            aria-label="Close admin menu"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        ) : null}
      </div>

      <nav className="mt-8 space-y-2" aria-label="Admin navigation">
        {visibleItems.map((item) => {
          const ItemIcon = item.icon;
          const isActive = location.pathname === item.to;
          const className = `flex w-full min-w-0 items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold transition ${
            isActive
              ? "bg-(--gw-color-gold) text-(--gw-color-green)"
              : "text-white/72 hover:bg-white/10 hover:text-white"
          } ${item.disabled ? "opacity-55" : ""}`;

          if (item.disabled) {
            return (
              <span key={item.to} className={className}>
                <ItemIcon className="h-4 w-4" aria-hidden="true" />
                <span className="truncate">{item.label}</span>
              </span>
            );
          }

          return (
            <Link key={item.to} to={item.to} className={className} onClick={onClose}>
              <ItemIcon className="h-4 w-4" aria-hidden="true" />
              <span className="truncate">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto rounded-3xl bg-white/8 p-4">
        <p className="text-sm font-semibold">{admin?.name || "Admin"}</p>
        <p className="mt-1 truncate text-xs text-white/55">{admin?.email}</p>
        <button
          type="button"
          onClick={onLogout}
          className="mt-4 inline-flex h-10 w-full items-center justify-center gap-2 rounded-full bg-white text-sm font-semibold text-(--gw-color-green) transition hover:bg-(--gw-color-cream)"
        >
          <LogOut className="h-4 w-4" aria-hidden="true" />
          Sign out
        </button>
      </div>
    </div>
  );
}
