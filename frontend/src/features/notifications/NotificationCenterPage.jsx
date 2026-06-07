import { Bell, CheckCheck, MailOpen } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { useAuth } from "@/features/auth/context/useAuth";
import DashboardHeader from "@/features/dashboard/components/DashboardHeader";
import DashboardSection from "@/features/dashboard/components/DashboardSection";
import EmptyState from "@/features/dashboard/components/EmptyState";
import {
  getNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/features/notifications/notificationService";
import { useNotificationStream } from "@/features/notifications/useNotificationStream";

function formatDate(value) {
  if (!value) {
    return "Not available";
  }

  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function entityLabel(notification) {
  return [notification.entityType, notification.entityId].filter(Boolean).join(" / ");
}

export default function NotificationCenterPage() {
  const { accessToken } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [busyId, setBusyId] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [statusMessage, setStatusMessage] = useState("");

  async function loadNotifications() {
    setIsLoading(true);
    setErrorMessage("");

    try {
      const result = await getNotifications(accessToken, {
        unreadOnly,
        limit: 100,
      });
      setNotifications(result?.data?.notifications || []);
      setUnreadCount(result?.data?.unreadCount || 0);
    } catch (error) {
      setNotifications([]);
      setUnreadCount(0);
      setErrorMessage(error.message || "Unable to load notifications.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    let isMounted = true;

    async function load() {
      setIsLoading(true);
      setErrorMessage("");

      try {
        const result = await getNotifications(accessToken, {
          unreadOnly,
          limit: 100,
        });

        if (isMounted) {
          setNotifications(result?.data?.notifications || []);
          setUnreadCount(result?.data?.unreadCount || 0);
        }
      } catch (error) {
        if (isMounted) {
          setNotifications([]);
          setUnreadCount(0);
          setErrorMessage(error.message || "Unable to load notifications.");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    load();

    return () => {
      isMounted = false;
    };
  }, [accessToken, unreadOnly]);

  useNotificationStream({
    accessToken,
    enabled: Boolean(accessToken),
    onNotification: ({ notification, unreadCount: nextUnreadCount }) => {
      if (!notification?.id) {
        return;
      }

      setNotifications((current) => {
        if (unreadOnly && notification.readAt) {
          return current;
        }

        return [
          notification,
          ...current.filter((item) => item.id !== notification.id),
        ].slice(0, 100);
      });
      setUnreadCount((current) =>
        typeof nextUnreadCount === "number" ? nextUnreadCount : current + 1,
      );
      setErrorMessage("");
    },
  });

  const summary = useMemo(
    () => ({
      loaded: notifications.length,
      unread: unreadCount,
      read: notifications.filter((notification) => notification.readAt).length,
    }),
    [notifications, unreadCount],
  );

  async function handleMarkRead(notification) {
    if (notification.readAt) {
      return;
    }

    setBusyId(notification.id);
    setErrorMessage("");
    setStatusMessage("");

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
      setStatusMessage("Notification marked as read.");
    } catch (error) {
      setErrorMessage(error.message || "Unable to update notification.");
    } finally {
      setBusyId("");
    }
  }

  async function handleMarkAllRead() {
    if (unreadCount === 0) {
      return;
    }

    setErrorMessage("");
    setStatusMessage("");

    try {
      await markAllNotificationsRead(accessToken);
      setNotifications((current) =>
        current.map((notification) => ({
          ...notification,
          readAt: notification.readAt || new Date().toISOString(),
        })),
      );
      setUnreadCount(0);
      setStatusMessage("All notifications marked as read.");
    } catch (error) {
      setErrorMessage(error.message || "Unable to update notifications.");
    }
  }

  return (
    <div className="space-y-6">
      <DashboardHeader
        eyebrow="Inbox"
        title="Notification center"
        description="Review bid, deal, commission, and account workflow notifications."
        action={
          <button
            type="button"
            onClick={handleMarkAllRead}
            disabled={unreadCount === 0}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-(--gw-color-gold) px-5 text-sm font-semibold text-(--gw-color-green) transition hover:bg-[#e0ad62] disabled:cursor-not-allowed disabled:opacity-60"
          >
            <CheckCheck className="h-4 w-4" aria-hidden="true" />
            Mark all read
          </button>
        }
      />

      {errorMessage ? (
        <p className="rounded-2xl bg-(--gw-color-copper)/10 px-4 py-3 text-sm font-medium text-(--gw-color-copper)">
          {errorMessage}
        </p>
      ) : null}

      {statusMessage ? (
        <p className="rounded-2xl bg-(--gw-color-gold)/12 px-4 py-3 text-sm font-medium text-(--gw-color-green)">
          {statusMessage}
        </p>
      ) : null}

      <section className="grid gap-4 md:grid-cols-3">
        <SummaryTile label="Loaded" value={summary.loaded} />
        <SummaryTile label="Unread" value={summary.unread} highlighted />
        <SummaryTile label="Read in view" value={summary.read} />
      </section>

      <DashboardSection
        title="Notifications"
        description="Unread notifications remain highlighted until marked as read."
        action={
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setUnreadOnly(false)}
              className={`h-10 rounded-full px-4 text-sm font-semibold transition ${
                !unreadOnly
                  ? "bg-(--gw-color-green) text-(--gw-color-cream)"
                  : "border border-(--gw-color-border) bg-white text-(--gw-color-green) hover:border-(--gw-color-gold)"
              }`}
            >
              All
            </button>
            <button
              type="button"
              onClick={() => setUnreadOnly(true)}
              className={`h-10 rounded-full px-4 text-sm font-semibold transition ${
                unreadOnly
                  ? "bg-(--gw-color-green) text-(--gw-color-cream)"
                  : "border border-(--gw-color-border) bg-white text-(--gw-color-green) hover:border-(--gw-color-gold)"
              }`}
            >
              Unread
            </button>
            <button
              type="button"
              onClick={loadNotifications}
              disabled={isLoading}
              className="h-10 rounded-full border border-(--gw-color-border) bg-white px-4 text-sm font-semibold text-(--gw-color-green) transition hover:border-(--gw-color-gold) disabled:cursor-not-allowed disabled:opacity-60"
            >
              Refresh
            </button>
          </div>
        }
      >
        {isLoading ? (
          <p className="rounded-2xl bg-(--gw-color-cream) px-4 py-3 text-sm text-(--gw-color-muted)">
            Loading notifications...
          </p>
        ) : null}

        {!isLoading && notifications.length === 0 ? (
          <EmptyState
            icon={Bell}
            title="No notifications"
            description="Workflow updates will appear here as account activity changes."
          />
        ) : null}

        {!isLoading && notifications.length > 0 ? (
          <div className="space-y-3">
            {notifications.map((notification) => (
              <article
                key={notification.id}
                className={`rounded-2xl border p-4 ${
                  notification.readAt
                    ? "border-(--gw-color-border) bg-white"
                    : "border-(--gw-color-gold)/45 bg-(--gw-color-gold)/10"
                }`}
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0">
                    <div className="flex min-w-0 items-start gap-3">
                      <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-white text-(--gw-color-green)">
                        <Bell className="h-4 w-4" aria-hidden="true" />
                      </span>
                      <div className="min-w-0">
                        <p className="gw-break-text text-base font-semibold text-(--gw-color-green)">
                          {notification.title}
                        </p>
                        <p className="gw-break-text mt-1 text-sm leading-6 text-(--gw-color-muted)">
                          {notification.body}
                        </p>
                      </div>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-(--gw-color-muted)">
                        {notification.type}
                      </span>
                      {entityLabel(notification) ? (
                        <span className="gw-break-text rounded-full bg-white px-3 py-1 text-xs font-semibold text-(--gw-color-muted)">
                          {entityLabel(notification)}
                        </span>
                      ) : null}
                      <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-(--gw-color-muted)">
                        {formatDate(notification.createdAt)}
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleMarkRead(notification)}
                    disabled={Boolean(notification.readAt) || busyId === notification.id}
                    className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-full border border-(--gw-color-border) bg-white px-4 text-sm font-semibold text-(--gw-color-green) transition hover:border-(--gw-color-gold) disabled:cursor-not-allowed disabled:opacity-55"
                  >
                    <MailOpen className="h-4 w-4" aria-hidden="true" />
                    {notification.readAt ? "Read" : "Mark read"}
                  </button>
                </div>
              </article>
            ))}
          </div>
        ) : null}
      </DashboardSection>
    </div>
  );
}

function SummaryTile({ label, value, highlighted = false }) {
  return (
    <div className="rounded-3xl border border-(--gw-color-border) bg-white p-5 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-(--gw-color-muted)">
        {label}
      </p>
      <p
        className={`mt-3 text-2xl font-semibold ${
          highlighted ? "text-(--gw-color-copper)" : "text-(--gw-color-green)"
        }`}
      >
        {value}
      </p>
    </div>
  );
}
