import { ReceiptIndianRupee, WalletCards } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import { ROUTES } from "@/constants/routes";
import { useAuth } from "@/features/auth/context/useAuth";
import DashboardHeader from "@/features/dashboard/components/DashboardHeader";
import DashboardSection from "@/features/dashboard/components/DashboardSection";
import EmptyState from "@/features/dashboard/components/EmptyState";
import {
  getMyCommissions,
  submitCommissionPayment,
} from "@/features/jeweller/services/jewellerCommissionService";

const unpaidStatuses = ["PENDING", "PAYMENT_INITIATED", "FAILED", "DISPUTED"];
const statusOptions = [
  "",
  "PENDING",
  "PAYMENT_INITIATED",
  "FAILED",
  "DISPUTED",
  "PAID",
  "WAIVED",
];
const referencePattern = /^[a-zA-Z0-9._:@/-]+$/;

function formatMoney(value) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

function formatDate(value) {
  if (!value) {
    return "Not available";
  }

  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function statusClass(status) {
  if (status === "PAID" || status === "WAIVED") {
    return "bg-(--gw-color-gold)/14 text-(--gw-color-green)";
  }

  if (status === "FAILED" || status === "DISPUTED") {
    return "bg-(--gw-color-copper)/10 text-(--gw-color-copper)";
  }

  return "bg-(--gw-color-cream) text-(--gw-color-green)";
}

function canSubmitPayment(commission) {
  return unpaidStatuses.includes(commission.status);
}

export default function JewellerCommissionsPage() {
  const { accessToken } = useAuth();
  const [commissions, setCommissions] = useState([]);
  const [statusFilter, setStatusFilter] = useState("");
  const [paymentDrafts, setPaymentDrafts] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [busyId, setBusyId] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [statusMessage, setStatusMessage] = useState("");

  async function loadCommissions() {
    setIsLoading(true);
    setErrorMessage("");

    try {
      const result = await getMyCommissions(accessToken, {
        status: statusFilter || undefined,
        limit: 100,
      });
      setCommissions(result?.data || []);
    } catch (error) {
      setCommissions([]);
      setErrorMessage(error.message || "Unable to load commissions.");
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
        const result = await getMyCommissions(accessToken, {
          status: statusFilter || undefined,
          limit: 100,
        });

        if (isMounted) {
          setCommissions(result?.data || []);
        }
      } catch (error) {
        if (isMounted) {
          setCommissions([]);
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
  }, [accessToken, statusFilter]);

  const summary = useMemo(
    () =>
      commissions.reduce(
        (totals, commission) => ({
          count: totals.count + 1,
          unpaidAmount:
            totals.unpaidAmount +
            (unpaidStatuses.includes(commission.status)
              ? Number(commission.commissionAmount || 0)
              : 0),
          submitted:
            totals.submitted +
            (commission.status === "PAYMENT_INITIATED" ? 1 : 0),
          cleared:
            totals.cleared +
            (["PAID", "WAIVED"].includes(commission.status) ? 1 : 0),
        }),
        { count: 0, unpaidAmount: 0, submitted: 0, cleared: 0 },
      ),
    [commissions],
  );

  function updateDraft(commissionId, patch) {
    setPaymentDrafts((current) => ({
      ...current,
      [commissionId]: {
        paymentReference: current[commissionId]?.paymentReference || "",
        paymentNote: current[commissionId]?.paymentNote || "",
        ...patch,
      },
    }));
  }

  async function handleSubmitPayment(commission) {
    const draft = paymentDrafts[commission.id] || {};
    const paymentReference = String(draft.paymentReference || "").trim();
    const paymentNote = String(draft.paymentNote || "").trim();

    if (paymentReference.length < 4 || !referencePattern.test(paymentReference)) {
      setErrorMessage("Enter a valid payment reference.");
      return;
    }

    setBusyId(commission.id);
    setErrorMessage("");
    setStatusMessage("");

    try {
      await submitCommissionPayment(accessToken, commission.id, {
        paymentReference,
        paymentNote: paymentNote || undefined,
      });
      setPaymentDrafts((current) => ({
        ...current,
        [commission.id]: { paymentReference: "", paymentNote: "" },
      }));
      setStatusMessage("Payment reference submitted for admin review.");
      await loadCommissions();
    } catch (error) {
      setErrorMessage(error.message || "Unable to submit payment reference.");
    } finally {
      setBusyId("");
    }
  }

  return (
    <div className="space-y-6">
      <DashboardHeader
        eyebrow="Commission payments"
        title="Platform commission dues"
        description="Track commission locks and submit payment references for finance admin review."
        action={
          <Link
            to={ROUTES.jewellerDeals}
            className="inline-flex h-11 items-center justify-center rounded-full bg-(--gw-color-gold) px-5 text-sm font-semibold text-(--gw-color-green) transition hover:bg-[#e0ad62]"
          >
            View deals
          </Link>
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

      <section className="grid gap-4 md:grid-cols-4">
        <MetricTile label="Records" value={summary.count} />
        <MetricTile label="Unpaid amount" value={formatMoney(summary.unpaidAmount)} danger />
        <MetricTile label="In review" value={summary.submitted} />
        <MetricTile label="Cleared" value={summary.cleared} />
      </section>

      <DashboardSection
        title="Commission records"
        description="A commission remains locked until finance marks it paid or waives it."
        action={
          <label className="block text-sm font-semibold text-(--gw-color-green)">
            Status
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="mt-2 h-11 rounded-2xl border border-(--gw-color-border) bg-(--gw-color-cream) px-4 text-sm outline-none focus:border-(--gw-color-gold)"
            >
              {statusOptions.map((status) => (
                <option key={status || "ALL"} value={status}>
                  {status || "All commissions"}
                </option>
              ))}
            </select>
          </label>
        }
      >
        {isLoading ? (
          <p className="rounded-2xl bg-(--gw-color-cream) px-4 py-3 text-sm text-(--gw-color-muted)">
            Loading commission records...
          </p>
        ) : null}

        {!isLoading && commissions.length === 0 ? (
          <EmptyState
            icon={WalletCards}
            title="No commission dues"
            description="Accepted bid commissions will appear here after a seller accepts your bid."
          />
        ) : null}

        {!isLoading && commissions.length > 0 ? (
          <div className="space-y-4">
            {commissions.map((commission) => {
              const draft = paymentDrafts[commission.id] || {};

              return (
                <article
                  key={commission.id}
                  className="rounded-2xl border border-(--gw-color-border) bg-white p-4"
                >
                  <div className="grid gap-4 xl:grid-cols-[1fr_22rem]">
                    <div className="min-w-0">
                      <div className="flex min-w-0 items-start gap-3">
                        <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-(--gw-color-cream) text-(--gw-color-green)">
                          <ReceiptIndianRupee className="h-5 w-5" aria-hidden="true" />
                        </span>
                        <div className="min-w-0">
                          <p className="gw-break-text text-base font-semibold text-(--gw-color-green)">
                            {commission.listingTitle || "Accepted bid"}
                          </p>
                          <p className="mt-1 text-sm text-(--gw-color-muted)">
                            Seller: {commission.sellerName || "Verified seller"}
                          </p>
                        </div>
                      </div>
                      <div className="mt-4 grid gap-3 md:grid-cols-3">
                        <Detail label="Gross deal" value={formatMoney(commission.grossDealAmount)} />
                        <Detail
                          label="Commission"
                          value={`${formatMoney(commission.commissionAmount)} / ${Number(commission.commissionRate || 0) * 100}%`}
                        />
                        <Detail label="Due" value={formatDate(commission.dueAt)} />
                        <Detail label="Deal status" value={commission.dealStatus} />
                        <Detail
                          label="Last submitted"
                          value={formatDate(commission.lastPaymentAttemptAt)}
                        />
                        <Detail
                          label="Reference"
                          value={commission.paymentReference || "Not submitted"}
                        />
                      </div>
                    </div>

                    <div className="rounded-2xl bg-(--gw-color-cream) p-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${statusClass(commission.status)}`}
                        >
                          {commission.status}
                        </span>
                        <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-(--gw-color-muted)">
                          Attempts: {commission.paymentAttemptCount || 0}
                        </span>
                      </div>

                      {canSubmitPayment(commission) ? (
                        <div className="mt-4 space-y-3">
                          <input
                            type="text"
                            value={draft.paymentReference || ""}
                            maxLength={100}
                            placeholder="Payment reference"
                            onChange={(event) =>
                              updateDraft(commission.id, {
                                paymentReference: event.target.value,
                              })
                            }
                            className="h-11 w-full rounded-2xl border border-(--gw-color-border) bg-white px-4 text-sm outline-none focus:border-(--gw-color-gold)"
                          />
                          <textarea
                            value={draft.paymentNote || ""}
                            maxLength={500}
                            rows={3}
                            placeholder="Optional payment note"
                            onChange={(event) =>
                              updateDraft(commission.id, {
                                paymentNote: event.target.value,
                              })
                            }
                            className="w-full resize-none rounded-2xl border border-(--gw-color-border) bg-white px-4 py-3 text-sm outline-none focus:border-(--gw-color-gold)"
                          />
                          <button
                            type="button"
                            onClick={() => handleSubmitPayment(commission)}
                            disabled={busyId === commission.id}
                            className="h-10 w-full rounded-full bg-(--gw-color-green) px-4 text-sm font-semibold text-(--gw-color-cream) transition hover:bg-(--gw-color-green-soft) disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {busyId === commission.id ? "Submitting..." : "Submit payment"}
                          </button>
                        </div>
                      ) : (
                        <p className="mt-4 text-sm leading-6 text-(--gw-color-muted)">
                          No payment action is available for this commission status.
                        </p>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        ) : null}
      </DashboardSection>
    </div>
  );
}

function MetricTile({ label, value, danger = false }) {
  return (
    <div className="rounded-3xl border border-(--gw-color-border) bg-white p-5 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-(--gw-color-muted)">
        {label}
      </p>
      <p
        className={`gw-break-text mt-3 text-2xl font-semibold ${
          danger ? "text-(--gw-color-copper)" : "text-(--gw-color-green)"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function Detail({ label, value }) {
  return (
    <div className="rounded-2xl bg-(--gw-color-cream) px-4 py-3">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-(--gw-color-muted)">
        {label}
      </p>
      <p className="gw-break-text mt-1 text-sm font-semibold text-(--gw-color-green)">
        {value || "Not available"}
      </p>
    </div>
  );
}
