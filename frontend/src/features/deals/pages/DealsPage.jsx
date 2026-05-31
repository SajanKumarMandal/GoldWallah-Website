import { BadgeCheck, Handshake, LockKeyhole, WalletCards } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { USER_ROLES } from "@/constants/roles";
import { useAuth } from "@/features/auth/context/useAuth";
import DashboardHeader from "@/features/dashboard/components/DashboardHeader";
import DashboardSection from "@/features/dashboard/components/DashboardSection";
import EmptyState from "@/features/dashboard/components/EmptyState";
import {
  completeDeal,
  getMyDeals,
} from "@/features/deals/services/dealService";

const statusOptions = [
  { value: "", label: "All deals" },
  { value: "COMMISSION_PENDING", label: "Commission pending" },
  { value: "READY_TO_SETTLE", label: "Ready to settle" },
  { value: "COMPLETED", label: "Completed" },
  { value: "CANCELLED", label: "Cancelled" },
];

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
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function statusCopy(deal) {
  if (deal.status === "COMMISSION_PENDING") {
    return "Commission must be paid or waived before this deal can be completed.";
  }

  if (deal.status === "READY_TO_SETTLE") {
    return "Commission is clear. The seller can mark this deal completed after settlement.";
  }

  if (deal.status === "COMPLETED") {
    return `Completed ${formatDate(deal.completedAt)}.`;
  }

  return "This deal is no longer active.";
}

export default function DealsPage() {
  const { accessToken, user } = useAuth();
  const [deals, setDeals] = useState([]);
  const [statusFilter, setStatusFilter] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [busyId, setBusyId] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const isSeller = user?.role === USER_ROLES.seller;
  const title = isSeller ? "Seller deals" : "Jeweller deals";
  const description = isSeller
    ? "Track accepted bids, commission clearance, and final seller completion."
    : "Track accepted bids, commission locks, and completed purchase records.";

  async function loadDeals() {
    setIsLoading(true);
    setErrorMessage("");

    try {
      const result = await getMyDeals(accessToken, {
        status: statusFilter || undefined,
        limit: 100,
      });
      setDeals(result?.data || []);
    } catch (error) {
      setDeals([]);
      setErrorMessage(error.message || "Unable to load deals.");
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
        const result = await getMyDeals(accessToken, {
          status: statusFilter || undefined,
          limit: 100,
        });

        if (isMounted) {
          setDeals(result?.data || []);
        }
      } catch (error) {
        if (isMounted) {
          setDeals([]);
          setErrorMessage(error.message || "Unable to load deals.");
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

  const totals = useMemo(() => {
    return deals.reduce(
      (summary, deal) => ({
        count: summary.count + 1,
        amount: summary.amount + Number(deal.finalAmount || 0),
        pendingCommission:
          summary.pendingCommission +
          (deal.status === "COMMISSION_PENDING" ? Number(deal.commissionAmount || 0) : 0),
      }),
      { count: 0, amount: 0, pendingCommission: 0 },
    );
  }, [deals]);

  async function handleComplete(deal) {
    const confirmed = window.confirm("Mark this deal as completed?");

    if (!confirmed) {
      return;
    }

    setBusyId(deal.id);
    setErrorMessage("");
    setStatusMessage("");

    try {
      await completeDeal(accessToken, deal.id);
      setStatusMessage("Deal marked completed.");
      await loadDeals();
    } catch (error) {
      setErrorMessage(error.message || "Unable to complete deal.");
    } finally {
      setBusyId("");
    }
  }

  return (
    <div className="space-y-6">
      <DashboardHeader
        eyebrow="Deal workspace"
        title={title}
        description={description}
      />

      <DashboardSection
        title="Deal controls"
        action={
          <label className="block text-sm font-semibold text-(--gw-color-green)">
            Status
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="mt-2 h-11 rounded-2xl border border-(--gw-color-border) bg-(--gw-color-cream) px-4 text-sm outline-none focus:border-(--gw-color-gold)"
            >
              {statusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        }
      >
        <div className="grid gap-4 md:grid-cols-3">
          <SummaryTile icon={Handshake} label="Deals" value={totals.count} />
          <SummaryTile
            icon={BadgeCheck}
            label="Gross deal value"
            value={formatMoney(totals.amount)}
          />
          <SummaryTile
            icon={WalletCards}
            label="Pending commission"
            value={formatMoney(totals.pendingCommission)}
          />
        </div>
      </DashboardSection>

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

      <DashboardSection title="Deals">
        {isLoading ? (
          <p className="rounded-2xl bg-(--gw-color-cream) px-4 py-3 text-sm text-(--gw-color-muted)">
            Loading deals...
          </p>
        ) : null}

        {!isLoading && deals.length === 0 ? (
          <EmptyState
            icon={LockKeyhole}
            title="No deals yet"
            description="Accepted private bids become deal records and appear here."
          />
        ) : null}

        <div className="space-y-3">
          {deals.map((deal) => {
            const canComplete = isSeller && deal.status === "READY_TO_SETTLE";

            return (
              <article
                key={deal.id}
                className="rounded-2xl border border-(--gw-color-border) bg-white p-4"
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0">
                    <p className="gw-break-text text-base font-semibold text-(--gw-color-green)">
                      {deal.listingTitle || "Accepted listing"}
                    </p>
                    <p className="mt-1 text-sm text-(--gw-color-muted)">
                      {isSeller
                        ? deal.jewellerName || "Verified jeweller"
                        : deal.sellerName || "Verified seller"}
                    </p>
                    <p className="mt-3 text-xl font-semibold text-(--gw-color-green)">
                      {formatMoney(deal.finalAmount)}
                    </p>
                    <p className="gw-break-text mt-2 text-sm text-(--gw-color-muted)">
                      {statusCopy(deal)}
                    </p>
                  </div>

                  <div className="min-w-0 space-y-3 lg:w-72">
                    <div className="rounded-2xl bg-(--gw-color-cream) px-4 py-3">
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-(--gw-color-muted)">
                        Status
                      </p>
                      <p className="gw-break-text mt-1 text-sm font-semibold text-(--gw-color-green)">
                        {deal.status}
                      </p>
                    </div>
                    <div className="rounded-2xl bg-(--gw-color-cream) px-4 py-3">
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-(--gw-color-muted)">
                        Commission
                      </p>
                      <p className="gw-break-text mt-1 text-sm font-semibold text-(--gw-color-green)">
                        {deal.commissionStatus || "Not available"} /{" "}
                        {formatMoney(deal.commissionAmount)}
                      </p>
                    </div>
                    {canComplete ? (
                      <button
                        type="button"
                        disabled={busyId === deal.id}
                        onClick={() => handleComplete(deal)}
                        className="h-11 w-full rounded-full bg-(--gw-color-green) px-5 text-sm font-semibold text-(--gw-color-cream) transition hover:bg-(--gw-color-green-soft) disabled:cursor-not-allowed disabled:opacity-70"
                      >
                        {busyId === deal.id ? "Completing..." : "Mark completed"}
                      </button>
                    ) : null}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </DashboardSection>
    </div>
  );
}

function SummaryTile({ icon: Icon, label, value }) {
  return (
    <div className="rounded-2xl border border-(--gw-color-border) bg-(--gw-color-cream) p-4">
      <Icon className="h-5 w-5 text-(--gw-color-gold)" aria-hidden="true" />
      <p className="mt-3 text-xs font-semibold uppercase tracking-[0.14em] text-(--gw-color-muted)">
        {label}
      </p>
      <p className="gw-break-text mt-1 text-xl font-semibold text-(--gw-color-green)">
        {value}
      </p>
    </div>
  );
}
