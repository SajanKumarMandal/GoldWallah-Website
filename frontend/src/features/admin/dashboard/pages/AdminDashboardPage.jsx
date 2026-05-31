import { useEffect, useState } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";

import { clearAdminSession } from "@/features/admin/auth/utils/adminTokenStorage";
import AdminStatCard from "@/features/admin/dashboard/components/AdminStatCard";
import PendingVerificationList from "@/features/admin/dashboard/components/PendingVerificationList";
import RecentAuditLogList from "@/features/admin/dashboard/components/RecentAuditLogList";
import SecurityAlertList from "@/features/admin/dashboard/components/SecurityAlertList";
import {
  getAdminDashboardSummary,
  getAdminPendingVerifications,
  getAdminRecentAuditLogs,
  getAdminSecurityAlerts,
} from "@/features/admin/dashboard/services/adminDashboardService";

const statCards = [
  ["totalSellers", "Total Sellers", "green"],
  ["totalJewellers", "Total Jewellers", "green"],
  ["pendingSellerKyc", "Pending Seller KYC", "gold"],
  ["pendingJewellerKyc", "Pending Jeweller KYC", "gold"],
  ["pendingBusinessVerifications", "Pending Business Verifications", "gold"],
  ["pendingCommissions", "Pending Commissions", "copper"],
  ["criticalAuditEventsLast24h", "Critical Security Alerts", "copper"],
];

export default function AdminDashboardPage() {
  const { accessToken, admin } = useOutletContext();
  const navigate = useNavigate();
  const [summary, setSummary] = useState(null);
  const [pending, setPending] = useState([]);
  const [audits, setAudits] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadDashboard() {
      setIsLoading(true);
      setErrorMessage("");

      try {
        const [summaryResult, pendingResult, auditResult, alertResult] =
          await Promise.all([
            getAdminDashboardSummary(accessToken),
            getAdminPendingVerifications(accessToken, 10),
            getAdminRecentAuditLogs(accessToken, 10),
            getAdminSecurityAlerts(accessToken),
          ]);

        if (!isMounted) {
          return;
        }

        setSummary(summaryResult?.data || {});
        setPending(pendingResult?.data || []);
        setAudits(auditResult?.data || []);
        setAlerts(alertResult?.data || []);
      } catch (error) {
        if (error.status === 401) {
          clearAdminSession();
          navigate("/admin/login", { replace: true });
          return;
        }

        if (isMounted) {
          setErrorMessage(error.message || "Unable to load admin dashboard.");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadDashboard();

    return () => {
      isMounted = false;
    };
  }, [accessToken, navigate]);

  return (
    <div className="space-y-6">
      <section className="min-w-0 rounded-3xl bg-(--gw-color-green) p-5 text-(--gw-color-cream) shadow-[0_24px_70px_rgba(26,54,45,0.18)] sm:p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-(--gw-color-gold) sm:tracking-[0.22em]">
          Admin dashboard
        </p>
        <h1 className="mt-3 text-2xl font-semibold sm:text-3xl">
          Operational overview
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-white/65">
          Monitor verification queues, audit activity, and platform risk signals.
        </p>
        <p className="gw-break-text mt-4 text-sm font-semibold text-white/80">
          Signed in as {admin?.name || "Admin"}
        </p>
      </section>

      {errorMessage ? (
        <p className="rounded-2xl bg-(--gw-color-copper)/10 px-4 py-3 text-sm font-medium text-(--gw-color-copper)">
          {errorMessage}
        </p>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {statCards.map(([key, label, tone]) => (
          <AdminStatCard
            key={key}
            label={label}
            value={summary?.[key]}
            tone={tone}
            isLoading={isLoading}
          />
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <PendingVerificationList items={pending} isLoading={isLoading} />
        <SecurityAlertList items={alerts} isLoading={isLoading} />
      </div>

      <RecentAuditLogList items={audits} isLoading={isLoading} />
    </div>
  );
}
