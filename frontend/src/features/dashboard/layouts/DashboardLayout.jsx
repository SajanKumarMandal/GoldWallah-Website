import {
  Bell,
  Building2,
  ChevronDown,
  Gem,
  Home,
  LogOut,
  Menu,
  PackageOpen,
  PlusCircle,
  Search,
  ShieldCheck,
  UserCircle,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";

import logo from "@/assets/logo.png";
import { ROUTES } from "@/constants/routes";
import { USER_ROLES } from "@/constants/roles";
import { useAuth } from "@/features/auth/context/useAuth";
import { logoutUser } from "@/features/auth/services/authService";
import SidebarItem from "@/features/dashboard/components/SidebarItem";
import {
  getNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/features/notifications/notificationService";

const navByRole = {
  [USER_ROLES.seller]: [
    { to: ROUTES.sellerDashboard, label: "Dashboard", icon: Home },
    { to: ROUTES.sellerKyc, label: "KYC", icon: ShieldCheck },
    { to: ROUTES.sellerListings, label: "My Listings", icon: PackageOpen },
    { to: ROUTES.sellerNewListing, label: "Create Listing", icon: PlusCircle },
  ],
  [USER_ROLES.jeweller]: [
    { to: ROUTES.jewellerDashboard, label: "Dashboard", icon: Home },
    { to: ROUTES.jewellerMarketplace, label: "Marketplace", icon: Search },
    { to: ROUTES.jewellerVerification, label: "Verification", icon: Building2 },
  ],
  [USER_ROLES.admin]: [
    { to: ROUTES.adminKyc, label: "Seller KYC", icon: ShieldCheck },
  ],
};

// Shared seller/jeweller dashboard shell: sidebar navigation, profile menu,
// logout, and durable notifications dropdown.
export default function DashboardLayout() {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notificationError, setNotificationError] = useState("");
  const { user, accessToken, clearAuthUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const navigation = useMemo(() => navByRole[user?.role] || [], [user?.role]);
  const roleLabel =
    user?.role === USER_ROLES.admin
      ? "Admin"
      : user?.role === USER_ROLES.jeweller
        ? "Jeweller"
        : "Seller";
  const userName = user?.fullName || roleLabel;

  async function loadNotifications() {
    if (!accessToken) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }

    try {
      const result = await getNotifications(accessToken, { limit: 5 });
      setNotifications(result?.data?.notifications || []);
      setUnreadCount(result?.data?.unreadCount || 0);
      setNotificationError("");
    } catch {
      setNotifications([]);
      setUnreadCount(0);
      setNotificationError("Notifications could not be loaded.");
    }
  }

  useEffect(() => {
    let isMounted = true;

    async function loadInitialNotifications() {
      if (!accessToken) {
        setNotifications([]);
        setUnreadCount(0);
        return;
      }

      try {
        const result = await getNotifications(accessToken, { limit: 5 });
        if (!isMounted) {
          return;
        }
        setNotifications(result?.data?.notifications || []);
        setUnreadCount(result?.data?.unreadCount || 0);
        setNotificationError("");
      } catch {
        if (!isMounted) {
          return;
        }
        setNotifications([]);
        setUnreadCount(0);
        setNotificationError("Notifications could not be loaded.");
      }
    }

    loadInitialNotifications();

    return () => {
      isMounted = false;
    };
  }, [accessToken]);

  async function handleLogout() {
    try {
      await logoutUser();
    } catch {
      // Local session cleanup must still happen if the server token is stale.
    } finally {
      clearAuthUser();
      navigate(ROUTES.login, { replace: true });
    }
  }

  async function toggleNotifications() {
    const nextOpen = !isNotificationsOpen;
    setIsNotificationsOpen(nextOpen);

    if (nextOpen) {
      await loadNotifications();
    }
  }

  async function handleMarkAllRead() {
    if (!accessToken || unreadCount === 0) {
      return;
    }

    try {
      await markAllNotificationsRead(accessToken);
      setNotifications((current) =>
        current.map((notification) => ({
          ...notification,
          readAt: notification.readAt || new Date().toISOString(),
        })),
      );
      setUnreadCount(0);
      setNotificationError("");
    } catch {
      setNotificationError("Notifications could not be updated.");
    }
  }

  async function handleNotificationRead(notification) {
    if (!accessToken || notification.readAt) {
      return;
    }

    try {
      await markNotificationRead(accessToken, notification.id);
      setNotifications((current) =>
        current.map((item) =>
          item.id === notification.id
            ? { ...item, readAt: item.readAt || new Date().toISOString() }
            : item,
        ),
      );
      setUnreadCount((current) => Math.max(current - 1, 0));
      setNotificationError("");
    } catch {
      setNotificationError("Notification could not be updated.");
    }
  }

  return (
    <div className="min-h-screen min-w-0 bg-(--gw-color-cream) text-(--gw-color-green)">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-72 border-r border-(--gw-color-border) bg-white/82 px-4 py-5 backdrop-blur-xl lg:block">
        <SidebarContent navigation={navigation} userRole={roleLabel} />
      </aside>

      {isDrawerOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Close navigation"
            className="absolute inset-0 bg-(--gw-color-green)/45"
            onClick={() => setIsDrawerOpen(false)}
          />
          <aside className="relative h-full w-[min(19rem,86vw)] overflow-y-auto border-r border-(--gw-color-border) bg-(--gw-color-cream) px-4 py-5 shadow-2xl">
            <div className="mb-4 flex justify-end">
              <button
                type="button"
                className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-(--gw-color-green) shadow"
                onClick={() => setIsDrawerOpen(false)}
                aria-label="Close menu"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
            <SidebarContent
              navigation={navigation}
              userRole={roleLabel}
              onNavigate={() => setIsDrawerOpen(false)}
            />
          </aside>
        </div>
      ) : null}

      <div className="min-w-0 lg:pl-72">
        <header className="sticky top-0 z-20 border-b border-(--gw-color-border)/80 bg-(--gw-color-cream)/88 backdrop-blur-xl">
          <div className="flex min-h-16 items-center justify-between gap-3 px-4 py-2 sm:px-6 lg:px-8">
            <div className="flex min-w-0 items-center gap-3">
              <button
                type="button"
                className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-(--gw-color-green) shadow-sm transition hover:bg-(--gw-color-gold)/12 lg:hidden"
                onClick={() => setIsDrawerOpen(true)}
                aria-label="Open menu"
              >
                <Menu className="h-5 w-5" aria-hidden="true" />
              </button>
              <div className="min-w-0">
                <p className="truncate text-xs font-semibold uppercase tracking-[0.16em] text-(--gw-color-muted) sm:tracking-[0.2em]">
                  GoldWallah
                </p>
                <p className="truncate text-sm font-semibold text-(--gw-color-green)">
                  {location.pathname.includes("verification") ||
                  location.pathname.includes("kyc")
                    ? "Verification"
                    : "Dashboard"}
                </p>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <button
                type="button"
                className="relative flex h-10 w-10 items-center justify-center rounded-full border border-(--gw-color-border) bg-white text-(--gw-color-green) transition hover:border-(--gw-color-gold)"
                aria-label="Notifications"
                onClick={toggleNotifications}
              >
                <Bell className="h-5 w-5" aria-hidden="true" />
                {unreadCount > 0 ? (
                  <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-(--gw-color-gold)" />
                ) : null}
              </button>

              {isNotificationsOpen ? (
                <div className="absolute right-4 top-14 z-30 w-[min(22rem,calc(100vw-2rem))] rounded-3xl border border-(--gw-color-border) bg-white p-3 shadow-[0_24px_70px_rgba(26,54,45,0.16)] sm:right-16">
                  <div className="flex items-center justify-between gap-3 px-2 py-1">
                    <p className="text-sm font-semibold text-(--gw-color-green)">
                      Notifications
                    </p>
                    <button
                      type="button"
                      onClick={handleMarkAllRead}
                      disabled={unreadCount === 0}
                      className="text-xs font-semibold text-(--gw-color-muted) transition hover:text-(--gw-color-green) disabled:cursor-not-allowed disabled:opacity-45"
                    >
                      Mark read
                    </button>
                  </div>
                  <div className="mt-2 space-y-2">
                    {notificationError ? (
                      <p className="rounded-2xl bg-(--gw-color-copper)/10 px-4 py-3 text-xs font-semibold text-(--gw-color-copper)">
                        {notificationError}
                      </p>
                    ) : null}
                    {notifications.length > 0 ? (
                      notifications.map((notification) => (
                        <button
                          type="button"
                          key={notification.id}
                          onClick={() => handleNotificationRead(notification)}
                          className="w-full rounded-2xl bg-(--gw-color-cream) px-4 py-3 text-left transition hover:bg-(--gw-color-gold)/12"
                        >
                          <div className="flex items-start gap-3">
                            {!notification.readAt ? (
                              <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-(--gw-color-gold)" />
                            ) : (
                              <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-transparent" />
                            )}
                            <div className="min-w-0">
                              <p className="gw-break-text text-sm font-semibold text-(--gw-color-green)">
                                {notification.title}
                              </p>
                              <p className="gw-break-text mt-1 text-xs leading-5 text-(--gw-color-muted)">
                                {notification.body}
                              </p>
                            </div>
                          </div>
                        </button>
                      ))
                    ) : (
                      <p className="rounded-2xl bg-(--gw-color-cream) px-4 py-3 text-sm text-(--gw-color-muted)">
                        No notifications.
                      </p>
                    )}
                  </div>
                </div>
              ) : null}

              <div className="relative">
                <button
                  type="button"
                  className="flex h-10 items-center gap-2 rounded-full border border-(--gw-color-border) bg-white py-1 pl-1 pr-3 text-sm font-semibold text-(--gw-color-green) transition hover:border-(--gw-color-gold)"
                  onClick={() => setIsProfileOpen((current) => !current)}
                  aria-expanded={isProfileOpen}
                >
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-(--gw-color-green) text-(--gw-color-gold)">
                    <UserCircle className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <span className="hidden max-w-32 truncate sm:block">{userName}</span>
                  <ChevronDown className="h-4 w-4" aria-hidden="true" />
                </button>

                {isProfileOpen ? (
                  <div className="absolute right-0 mt-3 w-[min(16rem,calc(100vw-2rem))] rounded-3xl border border-(--gw-color-border) bg-white p-3 shadow-[0_24px_70px_rgba(26,54,45,0.16)]">
                    <div className="rounded-2xl bg-(--gw-color-cream) p-4">
                      <p className="font-semibold text-(--gw-color-green)">{userName}</p>
                      <p className="mt-1 text-xs uppercase tracking-[0.18em] text-(--gw-color-muted)">
                        {roleLabel}
                      </p>
                    </div>
                    <button
                      type="button"
                      className="mt-2 flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-semibold text-(--gw-color-copper) transition hover:bg-(--gw-color-copper)/10"
                      onClick={handleLogout}
                    >
                      <LogOut className="h-4 w-4" aria-hidden="true" />
                      Sign out
                    </button>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </header>

        <main className="min-w-0 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

function SidebarContent({ navigation, userRole, onNavigate }) {
  return (
    <div className="flex h-full min-w-0 flex-col">
      <Link
        to={ROUTES.home}
        className="flex min-w-0 items-center gap-3 rounded-2xl px-2 py-2 transition hover:bg-white/70"
        onClick={onNavigate}
      >
        <img
          src={logo}
          alt="GoldWallah"
          loading="lazy"
          decoding="async"
          className="h-11 w-11 rounded-full object-cover"
        />
        <div className="min-w-0">
          <p className="truncate text-xl font-semibold text-(--gw-color-green)">GoldWallah</p>
          <p className="truncate text-xs font-semibold uppercase tracking-[0.2em] text-(--gw-color-muted)">
            {userRole}
          </p>
        </div>
      </Link>

      <nav className="mt-8 space-y-2" aria-label="Dashboard navigation">
        {navigation.map((item) => (
          <SidebarItem key={item.to} {...item} onClick={onNavigate} />
        ))}
      </nav>

      <div className="mt-auto rounded-3xl bg-(--gw-color-green) p-5 text-(--gw-color-cream)">
        <Gem className="h-6 w-6 text-(--gw-color-gold)" aria-hidden="true" />
        <p className="mt-4 text-sm font-semibold">Verified marketplace access</p>
        <p className="mt-2 text-xs leading-5 text-white/60">
          Complete verification to unlock the full GoldWallah workflow.
        </p>
      </div>
    </div>
  );
}
