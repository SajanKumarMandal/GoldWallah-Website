import { useState } from "react";
import { Outlet, useNavigate, useOutletContext } from "react-router-dom";

import { logoutAdmin } from "@/features/admin/auth/services/adminAuthService";
import { clearAdminSession } from "@/features/admin/auth/utils/adminTokenStorage";
import AdminSidebar from "@/features/admin/layouts/AdminSidebar";
import AdminTopbar from "@/features/admin/layouts/AdminTopbar";

export default function AdminLayout() {
  const { admin, accessToken } = useOutletContext();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const navigate = useNavigate();

  async function handleLogout() {
    try {
      if (accessToken) {
        await logoutAdmin(accessToken);
      }
    } catch {
      // Logout must clear local admin state even if the session is already invalid.
    } finally {
      clearAdminSession();
      navigate("/admin/login", { replace: true });
    }
  }

  return (
    <div className="min-h-screen min-w-0 bg-(--gw-color-cream) text-(--gw-color-green)">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-72 lg:block">
        <AdminSidebar admin={admin} onLogout={handleLogout} />
      </aside>

      {isDrawerOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Close admin navigation"
            className="absolute inset-0 bg-(--gw-color-green)/50"
            onClick={() => setIsDrawerOpen(false)}
          />
          <aside className="relative h-full w-[min(19rem,86vw)] overflow-y-auto">
            <AdminSidebar
              admin={admin}
              onLogout={handleLogout}
              onClose={() => setIsDrawerOpen(false)}
            />
          </aside>
        </div>
      ) : null}

      <div className="min-w-0 lg:pl-72">
        <AdminTopbar admin={admin} onMenuClick={() => setIsDrawerOpen(true)} />
        <main className="min-w-0 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <Outlet context={{ admin, accessToken }} />
        </main>
      </div>
    </div>
  );
}
