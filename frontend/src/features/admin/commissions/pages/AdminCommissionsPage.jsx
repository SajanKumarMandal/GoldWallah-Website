import { useEffect, useState } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";

import { clearAdminSession } from "@/features/admin/auth/utils/adminTokenStorage";
import {
  listAdminCommissions,
  markAdminCommissionPaid,
  waiveAdminCommission,
} from "@/features/admin/commissions/services/adminCommissionService";

// Admin finance screen. Finance admins settle or waive commission records; the
// backend writes audit logs and clears jeweller locks when dues are resolved.
const unpaidStatuses = ["PENDING", "PAYMENT_INITIATED", "FAILED", "DISPUTED"];

function formatMoney(value) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

function canSettle(commission) {
  return unpaidStatuses.includes(commission.status);
}

export default function AdminCommissionsPage() {
  const { accessToken } = useOutletContext();
  const navigate = useNavigate();
  const [commissions, setCommissions] = useState([]);
  const [statusFilter, setStatusFilter] = useState("PENDING");
  const [waiverReasons, setWaiverReasons] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [busyId, setBusyId] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  async function loadCommissions() {
    try {
      const result = await listAdminCommissions(accessToken, {
        status: statusFilter || undefined,
        limit: 100,
      });
      setCommissions(result?.data || []);
    } catch (error) {
      if (error.status === 401) {
        clearAdminSession();
        navigate("/admin/login", { replace: true });
        return;
      }
      setErrorMessage(error.message || "Unable to load commissions.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    let isMounted = true;

    async function load() {
      try {
        const result = await listAdminCommissions(accessToken, {
          status: statusFilter || undefined,
          limit: 100,
        });

        if (!isMounted) {
          return;
        }

        setCommissions(result?.data || []);
        setErrorMessage("");
      } catch (error) {
        if (error.status === 401) {
          clearAdminSession();
          navigate("/admin/login", { replace: true });
          return;
        }

        if (isMounted) {
          setErrorMessage(error.message || "Unable to load commissions.");
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
  }, [accessToken, navigate, statusFilter]);

  async function handleMarkPaid(commissionId) {
    setBusyId(commissionId);
    setErrorMessage("");

    try {
      await markAdminCommissionPaid(accessToken, commissionId);
      await loadCommissions();
    } catch (error) {
      setErrorMessage(error.message || "Unable to mark commission paid.");
    } finally {
      setBusyId("");
    }
  }

  async function handleWaive(commissionId) {
    const reason = waiverReasons[commissionId]?.trim();

    if (!reason || reason.length < 10) {
      setErrorMessage("Waiver reason must be at least 10 characters.");
      return;
    }

    setBusyId(commissionId);
    setErrorMessage("");

    try {
      await waiveAdminCommission(accessToken, commissionId, { reason });
      setWaiverReasons((current) => ({ ...current, [commissionId]: "" }));
      await loadCommissions();
    } catch (error) {
      setErrorMessage(error.message || "Unable to waive commission.");
    } finally {
      setBusyId("");
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-3xl bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-(--gw-color-muted) sm:tracking-[0.22em]">
              Admin finance
            </p>
            <h1 className="mt-2 text-2xl font-semibold text-(--gw-color-green) sm:text-3xl">
              Platform commissions
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-(--gw-color-muted)">
              Review unpaid commission dues and settle jeweller transaction locks.
            </p>
          </div>
          <label className="block w-full text-sm font-semibold text-(--gw-color-green) sm:w-auto">
            Status
            <select
              value={statusFilter}
              onChange={(event) => {
                setIsLoading(true);
                setErrorMessage("");
                setStatusFilter(event.target.value);
              }}
              className="mt-2 h-11 w-full rounded-2xl border border-(--gw-color-border) bg-(--gw-color-cream) px-4 text-sm outline-none focus:border-(--gw-color-gold) sm:w-auto"
            >
              <option value="">All</option>
              <option value="PENDING">Pending</option>
              <option value="PAYMENT_INITIATED">Payment initiated</option>
              <option value="FAILED">Failed</option>
              <option value="DISPUTED">Disputed</option>
              <option value="PAID">Paid</option>
              <option value="WAIVED">Waived</option>
            </select>
          </label>
        </div>
      </section>

      {errorMessage ? (
        <p className="rounded-2xl bg-(--gw-color-copper)/10 px-4 py-3 text-sm font-medium text-(--gw-color-copper)">
          {errorMessage}
        </p>
      ) : null}

      <section className="overflow-hidden rounded-3xl border border-(--gw-color-border) bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-[58rem] divide-y divide-(--gw-color-border) text-left text-sm">
            <thead className="bg-(--gw-color-cream) text-xs uppercase tracking-[0.16em] text-(--gw-color-muted)">
              <tr>
                <th className="px-5 py-4">Jeweller</th>
                <th className="px-5 py-4">Deal</th>
                <th className="px-5 py-4">Commission</th>
                <th className="px-5 py-4">Status</th>
                <th className="px-5 py-4">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-(--gw-color-border)">
              {isLoading ? (
                <tr>
                  <td colSpan="5" className="px-5 py-8 text-(--gw-color-muted)">
                    Loading commissions...
                  </td>
                </tr>
              ) : null}
              {!isLoading && commissions.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-5 py-8 text-(--gw-color-muted)">
                    No commission records match this filter.
                  </td>
                </tr>
              ) : null}
              {!isLoading
                ? commissions.map((commission) => (
                    <tr key={commission.id}>
                      <td className="px-5 py-4 align-top">
                        <p className="font-semibold text-(--gw-color-green)">
                          {commission.jewellerName || "Jeweller"}
                        </p>
                        <p className="gw-break-text mt-1 text-xs text-(--gw-color-muted)">
                          {commission.jewellerEmail || commission.jewellerId}
                        </p>
                      </td>
                      <td className="px-5 py-4 align-top">
                        <p className="font-semibold text-(--gw-color-green)">
                          {commission.listingTitle || "Accepted bid"}
                        </p>
                        <p className="mt-1 text-xs text-(--gw-color-muted)">
                          Gross {formatMoney(commission.grossDealAmount)}
                        </p>
                      </td>
                      <td className="px-5 py-4 align-top">
                        <p className="font-semibold text-(--gw-color-green)">
                          {formatMoney(commission.commissionAmount)}
                        </p>
                        <p className="mt-1 text-xs text-(--gw-color-muted)">
                          {Number(commission.commissionRate || 0) * 100}% fee
                        </p>
                      </td>
                      <td className="px-5 py-4 align-top">
                        <span className="rounded-full bg-(--gw-color-cream) px-3 py-1 text-xs font-semibold text-(--gw-color-green)">
                          {commission.status}
                        </span>
                      </td>
                      <td className="min-w-72 px-5 py-4 align-top">
                        {canSettle(commission) ? (
                          <div className="space-y-3">
                            <button
                              type="button"
                              onClick={() => handleMarkPaid(commission.id)}
                              disabled={busyId === commission.id}
                              className="inline-flex h-10 items-center justify-center rounded-full bg-(--gw-color-green) px-4 text-sm font-semibold text-white transition hover:bg-(--gw-color-green)/90 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              Mark paid
                            </button>
                            <div className="flex flex-col gap-2 sm:flex-row">
                              <input
                                type="text"
                                value={waiverReasons[commission.id] || ""}
                                onChange={(event) =>
                                  setWaiverReasons((current) => ({
                                    ...current,
                                    [commission.id]: event.target.value,
                                  }))
                                }
                                placeholder="Waiver reason"
                                className="h-10 min-w-0 flex-1 rounded-2xl border border-(--gw-color-border) px-3 text-sm outline-none focus:border-(--gw-color-gold)"
                              />
                              <button
                                type="button"
                                onClick={() => handleWaive(commission.id)}
                                disabled={busyId === commission.id}
                                className="h-10 rounded-full border border-(--gw-color-copper) px-4 text-sm font-semibold text-(--gw-color-copper) transition hover:bg-(--gw-color-copper)/10 disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                Waive
                              </button>
                            </div>
                          </div>
                        ) : (
                          <p className="text-sm text-(--gw-color-muted)">
                            No action available.
                          </p>
                        )}
                      </td>
                    </tr>
                  ))
                : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
