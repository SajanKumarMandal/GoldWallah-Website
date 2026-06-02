import { Gavel, LockKeyhole, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import { ROUTES } from "@/constants/routes";
import { useAuth } from "@/features/auth/context/useAuth";
import DashboardHeader from "@/features/dashboard/components/DashboardHeader";
import DashboardSection from "@/features/dashboard/components/DashboardSection";
import EmptyState from "@/features/dashboard/components/EmptyState";
import {
  getCurrentUser,
} from "@/features/dashboard/services/dashboardService";
import {
  getMyPrivateBids,
} from "@/features/jeweller/services/jewellerMarketplaceService";

const statusOptions = ["", "PENDING", "ACCEPTED", "REJECTED"];

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
  if (status === "ACCEPTED") {
    return "bg-(--gw-color-gold)/14 text-(--gw-color-green)";
  }

  if (status === "REJECTED") {
    return "bg-(--gw-color-copper)/10 text-(--gw-color-copper)";
  }

  return "bg-(--gw-color-cream) text-(--gw-color-green)";
}

function getBidsGate(user) {
  if (user?.kycStatus !== "APPROVED") {
    return {
      title: "KYC approval required",
      description: "Complete jeweller KYC before your private bids can be listed.",
      to: ROUTES.jewellerKyc,
      label: "Complete KYC",
    };
  }

  if (user?.businessVerificationStatus !== "APPROVED") {
    return {
      title: "Business verification required",
      description: "Approved business verification is required before bidding activity is available.",
      to: ROUTES.jewellerVerification,
      label: "Complete Verification",
    };
  }

  return null;
}

export default function JewellerBidsPage() {
  const { accessToken, user, setAuthUser } = useAuth();
  const [bids, setBids] = useState([]);
  const [statusFilter, setStatusFilter] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const bidsGate = getBidsGate(user);

  useEffect(() => {
    let isMounted = true;

    async function loadBids() {
      setIsLoading(true);
      setErrorMessage("");

      try {
        const currentUserResult = await getCurrentUser(accessToken);
        const currentUser = currentUserResult?.data || user;

        if (!isMounted) {
          return;
        }

        if (currentUserResult?.data) {
          setAuthUser(currentUserResult.data);
        }

        if (getBidsGate(currentUser)) {
          setBids([]);
          return;
        }

        const result = await getMyPrivateBids(accessToken, { limit: 100 });

        if (isMounted) {
          setBids(result?.data || []);
        }
      } catch (error) {
        if (isMounted) {
          setBids([]);
          setErrorMessage(error.message || "Unable to load private bids.");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadBids();

    return () => {
      isMounted = false;
    };
  }, [accessToken, setAuthUser, user]);

  const visibleBids = useMemo(() => {
    if (!statusFilter) {
      return bids;
    }

    return bids.filter((bid) => bid.status === statusFilter);
  }, [bids, statusFilter]);

  const summary = useMemo(
    () =>
      bids.reduce(
        (totals, bid) => ({
          count: totals.count + 1,
          pending: totals.pending + (bid.status === "PENDING" ? 1 : 0),
          accepted: totals.accepted + (bid.status === "ACCEPTED" ? 1 : 0),
          acceptedValue:
            totals.acceptedValue +
            (bid.status === "ACCEPTED" ? Number(bid.bidAmount || 0) : 0),
        }),
        { count: 0, pending: 0, accepted: 0, acceptedValue: 0 },
      ),
    [bids],
  );

  return (
    <div className="space-y-6">
      <DashboardHeader
        eyebrow="Private bidding"
        title="My bids"
        description="Track your private bid history, seller decisions, and accepted bid values."
        action={
          <Link
            to={ROUTES.jewellerMarketplace}
            className="inline-flex h-11 items-center justify-center rounded-full bg-(--gw-color-gold) px-5 text-sm font-semibold text-(--gw-color-green) transition hover:bg-[#e0ad62]"
          >
            Browse listings
          </Link>
        }
      />

      {errorMessage ? (
        <p className="rounded-2xl bg-(--gw-color-copper)/10 px-4 py-3 text-sm font-medium text-(--gw-color-copper)">
          {errorMessage}
        </p>
      ) : null}

      <section className="grid gap-4 md:grid-cols-4">
        <BidMetric label="Total bids" value={summary.count} />
        <BidMetric label="Pending" value={summary.pending} />
        <BidMetric label="Accepted" value={summary.accepted} />
        <BidMetric label="Accepted value" value={formatMoney(summary.acceptedValue)} />
      </section>

      <DashboardSection
        title="Bid history"
        description="Bid amounts remain private to you and the listing seller."
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
                  {status || "All bids"}
                </option>
              ))}
            </select>
          </label>
        }
      >
        {bidsGate && !isLoading ? (
          <EmptyState
            icon={LockKeyhole}
            title={bidsGate.title}
            description={bidsGate.description}
            action={
              <Link
                to={bidsGate.to}
                className="inline-flex h-11 items-center justify-center rounded-full bg-(--gw-color-green) px-5 text-sm font-semibold text-(--gw-color-cream) transition hover:bg-(--gw-color-green-soft)"
              >
                {bidsGate.label}
              </Link>
            }
          />
        ) : null}

        {!bidsGate && isLoading ? (
          <p className="rounded-2xl bg-(--gw-color-cream) px-4 py-3 text-sm text-(--gw-color-muted)">
            Loading private bids...
          </p>
        ) : null}

        {!bidsGate && !isLoading && visibleBids.length === 0 ? (
          <EmptyState
            icon={Search}
            title="No bids found"
            description="Private bids you place on seller listings will appear here."
            action={
              <Link
                to={ROUTES.jewellerMarketplace}
                className="inline-flex h-11 items-center justify-center rounded-full bg-(--gw-color-green) px-5 text-sm font-semibold text-(--gw-color-cream) transition hover:bg-(--gw-color-green-soft)"
              >
                Browse listings
              </Link>
            }
          />
        ) : null}

        {!bidsGate && !isLoading && visibleBids.length > 0 ? (
          <div className="space-y-3">
            {visibleBids.map((bid) => (
              <article
                key={bid.id}
                className="rounded-2xl border border-(--gw-color-border) bg-white p-4"
              >
                <div className="grid gap-4 lg:grid-cols-[1fr_18rem]">
                  <div className="min-w-0">
                    <div className="flex min-w-0 items-start gap-3">
                      <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-(--gw-color-cream) text-(--gw-color-green)">
                        <Gavel className="h-4 w-4" aria-hidden="true" />
                      </span>
                      <div className="min-w-0">
                        <p className="gw-break-text text-base font-semibold text-(--gw-color-green)">
                          {bid.listingTitle || "Seller listing"}
                        </p>
                        <p className="gw-break-text mt-1 text-sm text-(--gw-color-muted)">
                          Listing status: {bid.listingStatus || "Not available"}
                        </p>
                      </div>
                    </div>
                    {bid.message ? (
                      <p className="gw-break-text mt-4 rounded-2xl bg-(--gw-color-cream) px-4 py-3 text-sm leading-6 text-(--gw-color-muted)">
                        {bid.message}
                      </p>
                    ) : null}
                  </div>

                  <div className="rounded-2xl bg-(--gw-color-cream) p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-(--gw-color-muted)">
                      Bid amount
                    </p>
                    <p className="mt-2 text-2xl font-semibold text-(--gw-color-green)">
                      {formatMoney(bid.bidAmount)}
                    </p>
                    <div className="mt-4 flex flex-wrap items-center gap-2">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${statusClass(bid.status)}`}
                      >
                        {bid.status}
                      </span>
                      <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-(--gw-color-muted)">
                        {formatDate(bid.createdAt)}
                      </span>
                    </div>
                    {bid.decidedAt ? (
                      <p className="mt-3 text-xs text-(--gw-color-muted)">
                        Decided {formatDate(bid.decidedAt)}
                      </p>
                    ) : null}
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : null}
      </DashboardSection>
    </div>
  );
}

function BidMetric({ label, value }) {
  return (
    <div className="rounded-3xl border border-(--gw-color-border) bg-white p-5 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-(--gw-color-muted)">
        {label}
      </p>
      <p className="gw-break-text mt-3 text-2xl font-semibold text-(--gw-color-green)">
        {value}
      </p>
    </div>
  );
}
