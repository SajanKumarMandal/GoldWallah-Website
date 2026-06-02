import { AlertTriangle, RotateCw, Search } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";

import { ROUTES } from "@/constants/routes";
import { clearAdminSession } from "@/features/admin/auth/utils/adminTokenStorage";
import {
  listAuditLogs,
  listSecurityAlerts,
} from "@/features/admin/services/adminAuditService";
import { formatAuditDate } from "@/features/admin/dashboard/components/auditFormat";
import DashboardHeader from "@/features/dashboard/components/DashboardHeader";
import DashboardSection from "@/features/dashboard/components/DashboardSection";

const severityOptions = ["", "INFO", "WARNING", "CRITICAL"];
const securitySeverityOptions = ["", "WARNING", "CRITICAL"];
const initialFilters = {
  severity: "",
  action: "",
  resourceType: "",
};

function normalizeValue(value) {
  const trimmed = String(value || "").trim();
  return trimmed || undefined;
}

function severityClass(severity) {
  if (severity === "CRITICAL") {
    return "bg-(--gw-color-copper)/12 text-(--gw-color-copper)";
  }

  if (severity === "WARNING") {
    return "bg-(--gw-color-gold)/14 text-(--gw-color-green)";
  }

  return "bg-(--gw-color-cream) text-(--gw-color-muted)";
}

function actorLabel(item) {
  if (!item.actorAdminName && !item.actorAdminEmail) {
    return "System";
  }

  return [item.actorAdminName, item.actorAdminEmail].filter(Boolean).join(" / ");
}

export default function AdminAuditSecurityPage() {
  const { accessToken } = useOutletContext();
  const navigate = useNavigate();
  const [filters, setFilters] = useState(initialFilters);
  const [appliedFilters, setAppliedFilters] = useState(initialFilters);
  const [periodHours, setPeriodHours] = useState("24");
  const [securitySeverity, setSecuritySeverity] = useState("");
  const [auditLogs, setAuditLogs] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [nextCursor, setNextCursor] = useState("");
  const [isLoadingLogs, setIsLoadingLogs] = useState(true);
  const [isLoadingAlerts, setIsLoadingAlerts] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const alertCounts = useMemo(
    () =>
      alerts.reduce(
        (counts, item) => ({
          ...counts,
          [item.severity]: (counts[item.severity] || 0) + 1,
        }),
        {},
      ),
    [alerts],
  );

  const handleAuthError = useCallback(async (error) => {
    if (error.status === 401) {
      clearAdminSession();
      navigate(ROUTES.adminLogin, { replace: true });
      return true;
    }

    return false;
  }, [navigate]);

  async function loadAuditLogs({ cursor = "", append = false } = {}) {
    if (cursor) {
      setIsLoadingMore(true);
    } else {
      setIsLoadingLogs(true);
    }

    setErrorMessage("");

    try {
      const result = await listAuditLogs(accessToken, {
        severity: normalizeValue(appliedFilters.severity),
        action: normalizeValue(appliedFilters.action),
        resourceType: normalizeValue(appliedFilters.resourceType),
        cursor: normalizeValue(cursor),
        limit: 50,
      });
      const logs = result?.data?.logs || [];
      setAuditLogs((current) => (append ? [...current, ...logs] : logs));
      setNextCursor(result?.data?.nextCursor || "");
    } catch (error) {
      if (await handleAuthError(error)) {
        return;
      }

      setErrorMessage(error.message || "Unable to load audit logs.");
    } finally {
      setIsLoadingLogs(false);
      setIsLoadingMore(false);
    }
  }

  async function loadSecurityAlerts() {
    setIsLoadingAlerts(true);
    setErrorMessage("");

    try {
      const result = await listSecurityAlerts(accessToken, {
        severity: normalizeValue(securitySeverity),
        periodHours,
        limit: 50,
      });
      setAlerts(result?.data?.alerts || []);
    } catch (error) {
      if (await handleAuthError(error)) {
        return;
      }

      setErrorMessage(error.message || "Unable to load security alerts.");
    } finally {
      setIsLoadingAlerts(false);
    }
  }

  useEffect(() => {
    let isMounted = true;

    async function load() {
      setIsLoadingLogs(true);
      setErrorMessage("");

      try {
        const result = await listAuditLogs(accessToken, {
          severity: normalizeValue(appliedFilters.severity),
          action: normalizeValue(appliedFilters.action),
          resourceType: normalizeValue(appliedFilters.resourceType),
          limit: 50,
        });

        if (isMounted) {
          setAuditLogs(result?.data?.logs || []);
          setNextCursor(result?.data?.nextCursor || "");
        }
      } catch (error) {
        if (await handleAuthError(error)) {
          return;
        }

        if (isMounted) {
          setErrorMessage(error.message || "Unable to load audit logs.");
        }
      } finally {
        if (isMounted) {
          setIsLoadingLogs(false);
        }
      }
    }

    load();

    return () => {
      isMounted = false;
    };
  }, [accessToken, appliedFilters, handleAuthError]);

  useEffect(() => {
    let isMounted = true;

    async function load() {
      setIsLoadingAlerts(true);

      try {
        const result = await listSecurityAlerts(accessToken, {
          severity: normalizeValue(securitySeverity),
          periodHours,
          limit: 50,
        });

        if (isMounted) {
          setAlerts(result?.data?.alerts || []);
        }
      } catch (error) {
        if (await handleAuthError(error)) {
          return;
        }

        if (isMounted) {
          setErrorMessage(error.message || "Unable to load security alerts.");
        }
      } finally {
        if (isMounted) {
          setIsLoadingAlerts(false);
        }
      }
    }

    load();

    return () => {
      isMounted = false;
    };
  }, [accessToken, handleAuthError, periodHours, securitySeverity]);

  function handleFilterSubmit(event) {
    event.preventDefault();
    setAppliedFilters({
      severity: filters.severity,
      action: filters.action.trim(),
      resourceType: filters.resourceType.trim(),
    });
  }

  function resetFilters() {
    setFilters(initialFilters);
    setAppliedFilters(initialFilters);
  }

  return (
    <div className="space-y-6">
      <DashboardHeader
        eyebrow="Security operations"
        title="Audit and fraud center"
        description="Review admin activity, permission denials, account safety warnings, and critical security events."
      />

      {errorMessage ? (
        <p className="rounded-2xl bg-(--gw-color-copper)/10 px-4 py-3 text-sm font-medium text-(--gw-color-copper)">
          {errorMessage}
        </p>
      ) : null}

      <section className="grid gap-4 lg:grid-cols-3">
        <MetricTile label="Warning alerts" value={alertCounts.WARNING || 0} />
        <MetricTile label="Critical alerts" value={alertCounts.CRITICAL || 0} critical />
        <MetricTile label="Audit events loaded" value={auditLogs.length} />
      </section>

      <DashboardSection
        title="Security alerts"
        description="Warning and critical admin events are grouped here for fast incident review."
      >
        <div className="mb-5 grid gap-3 md:grid-cols-[12rem_12rem_auto]">
          <label className="block text-sm font-semibold text-(--gw-color-green)">
            Window
            <select
              value={periodHours}
              onChange={(event) => setPeriodHours(event.target.value)}
              className="mt-2 h-11 w-full rounded-2xl border border-(--gw-color-border) bg-white px-4 text-sm outline-none focus:border-(--gw-color-gold)"
            >
              <option value="24">Last 24 hours</option>
              <option value="72">Last 3 days</option>
              <option value="168">Last 7 days</option>
            </select>
          </label>
          <label className="block text-sm font-semibold text-(--gw-color-green)">
            Severity
            <select
              value={securitySeverity}
              onChange={(event) => setSecuritySeverity(event.target.value)}
              className="mt-2 h-11 w-full rounded-2xl border border-(--gw-color-border) bg-white px-4 text-sm outline-none focus:border-(--gw-color-gold)"
            >
              {securitySeverityOptions.map((option) => (
                <option key={option || "ALL"} value={option}>
                  {option || "All"}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            onClick={loadSecurityAlerts}
            disabled={isLoadingAlerts}
            className="mt-auto inline-flex h-11 items-center justify-center gap-2 rounded-full border border-(--gw-color-border) bg-white px-4 text-sm font-semibold text-(--gw-color-green) transition hover:border-(--gw-color-gold) disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RotateCw className="h-4 w-4" aria-hidden="true" />
            Refresh
          </button>
        </div>

        {isLoadingAlerts ? (
          <p className="rounded-2xl bg-(--gw-color-cream) px-4 py-3 text-sm text-(--gw-color-muted)">
            Loading security alerts...
          </p>
        ) : null}

        {!isLoadingAlerts && alerts.length === 0 ? (
          <p className="rounded-2xl bg-(--gw-color-cream) px-4 py-3 text-sm text-(--gw-color-muted)">
            No security alerts match this window.
          </p>
        ) : null}

        {!isLoadingAlerts && alerts.length > 0 ? (
          <div className="space-y-3">
            {alerts.map((item) => (
              <AuditEventRow key={item.id} item={item} alert />
            ))}
          </div>
        ) : null}
      </DashboardSection>

      <DashboardSection
        title="Audit event search"
        description="Use exact action and resource filters for incident review and operational traceability."
      >
        <form
          className="mb-5 grid gap-3 lg:grid-cols-[12rem_1fr_1fr_auto_auto]"
          onSubmit={handleFilterSubmit}
        >
          <label className="block text-sm font-semibold text-(--gw-color-green)">
            Severity
            <select
              value={filters.severity}
              onChange={(event) =>
                setFilters((current) => ({
                  ...current,
                  severity: event.target.value,
                }))
              }
              className="mt-2 h-11 w-full rounded-2xl border border-(--gw-color-border) bg-white px-4 text-sm outline-none focus:border-(--gw-color-gold)"
            >
              {severityOptions.map((option) => (
                <option key={option || "ALL"} value={option}>
                  {option || "All"}
                </option>
              ))}
            </select>
          </label>
          <AuditInput
            label="Action"
            value={filters.action}
            placeholder="ADMIN_PERMISSION_DENIED"
            onChange={(value) =>
              setFilters((current) => ({ ...current, action: value }))
            }
          />
          <AuditInput
            label="Resource"
            value={filters.resourceType}
            placeholder="ADMIN_PERMISSION"
            onChange={(value) =>
              setFilters((current) => ({ ...current, resourceType: value }))
            }
          />
          <button
            type="submit"
            className="mt-auto inline-flex h-11 items-center justify-center gap-2 rounded-full bg-(--gw-color-green) px-5 text-sm font-semibold text-(--gw-color-cream) transition hover:bg-(--gw-color-green-soft)"
          >
            <Search className="h-4 w-4" aria-hidden="true" />
            Search
          </button>
          <button
            type="button"
            onClick={resetFilters}
            className="mt-auto h-11 rounded-full border border-(--gw-color-border) bg-white px-5 text-sm font-semibold text-(--gw-color-green) transition hover:border-(--gw-color-gold)"
          >
            Reset
          </button>
        </form>

        {isLoadingLogs ? (
          <p className="rounded-2xl bg-(--gw-color-cream) px-4 py-3 text-sm text-(--gw-color-muted)">
            Loading audit events...
          </p>
        ) : null}

        {!isLoadingLogs && auditLogs.length === 0 ? (
          <p className="rounded-2xl bg-(--gw-color-cream) px-4 py-3 text-sm text-(--gw-color-muted)">
            No audit events match these filters.
          </p>
        ) : null}

        {!isLoadingLogs && auditLogs.length > 0 ? (
          <div className="space-y-3">
            {auditLogs.map((item) => (
              <AuditEventRow key={item.id} item={item} />
            ))}
          </div>
        ) : null}

        {!isLoadingLogs && nextCursor ? (
          <div className="mt-5">
            <button
              type="button"
              disabled={isLoadingMore}
              onClick={() => loadAuditLogs({ cursor: nextCursor, append: true })}
              className="inline-flex h-11 items-center justify-center rounded-full border border-(--gw-color-border) bg-white px-5 text-sm font-semibold text-(--gw-color-green) transition hover:border-(--gw-color-gold) disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isLoadingMore ? "Loading..." : "Load more"}
            </button>
          </div>
        ) : null}
      </DashboardSection>
    </div>
  );
}

function MetricTile({ label, value, critical = false }) {
  return (
    <div className="rounded-3xl border border-(--gw-color-border) bg-white p-5 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-(--gw-color-muted)">
        {label}
      </p>
      <p
        className={`mt-3 text-3xl font-semibold ${
          critical ? "text-(--gw-color-copper)" : "text-(--gw-color-green)"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function AuditInput({ label, value, onChange, placeholder }) {
  return (
    <label className="block text-sm font-semibold text-(--gw-color-green)">
      {label}
      <input
        type="text"
        value={value}
        maxLength={100}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 h-11 w-full rounded-2xl border border-(--gw-color-border) bg-white px-4 text-sm outline-none transition placeholder:text-(--gw-color-muted)/60 focus:border-(--gw-color-gold) focus:ring-4 focus:ring-(--gw-color-gold)/15"
      />
    </label>
  );
}

function AuditEventRow({ item, alert = false }) {
  return (
    <article
      className={`rounded-2xl border p-4 ${
        alert
          ? "border-(--gw-color-copper)/25 bg-(--gw-color-copper)/8"
          : "border-(--gw-color-border) bg-white"
      }`}
    >
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <div className="flex min-w-0 items-start gap-3">
            {alert ? (
              <AlertTriangle
                className="mt-0.5 h-4 w-4 shrink-0 text-(--gw-color-copper)"
                aria-hidden="true"
              />
            ) : null}
            <div className="min-w-0">
              <p className="gw-break-text text-sm font-semibold text-(--gw-color-green)">
                {item.action}
              </p>
              <p className="gw-break-text mt-1 text-xs leading-5 text-(--gw-color-muted)">
                {actorLabel(item)} · {item.resourceType || "Resource"}
                {item.resourceId ? ` · ${item.resourceId}` : ""}
              </p>
            </div>
          </div>
          {item.reason ? (
            <p className="gw-break-text mt-3 rounded-2xl bg-white/70 px-4 py-2 text-xs leading-5 text-(--gw-color-muted)">
              {item.reason}
            </p>
          ) : null}
          <div className="mt-3 grid gap-2 text-xs text-(--gw-color-muted) md:grid-cols-3">
            <span className="gw-break-text">IP: {item.ipAddress || "Not recorded"}</span>
            <span className="gw-break-text">
              Request: {item.requestId || "Not recorded"}
            </span>
            <span className="gw-break-text">
              User agent: {item.userAgent || "Not recorded"}
            </span>
          </div>
        </div>
        <div className="shrink-0 space-y-2 md:text-right">
          <span
            className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${severityClass(item.severity)}`}
          >
            {item.severity}
          </span>
          <p className="text-xs text-(--gw-color-muted)">
            {formatAuditDate(item.createdAt)}
          </p>
        </div>
      </div>
    </article>
  );
}
