import { NavLink } from "react-router-dom";

export default function SidebarItem({ to, icon: Icon, label, onClick }) {
  return (
    <NavLink
      to={to}
      onClick={onClick}
      className={({ isActive }) =>
        `flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold transition ${
          isActive
            ? "bg-(--gw-color-gold)/16 text-(--gw-color-green)"
            : "text-(--gw-color-muted) hover:bg-white/75 hover:text-(--gw-color-green)"
        }`
      }
    >
      <Icon className="h-5 w-5" aria-hidden="true" />
      <span>{label}</span>
    </NavLink>
  );
}
