import { RotateCw, Search, ShieldAlert, UsersRound } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";

import { ROUTES } from "@/constants/routes";
import { clearAdminSession } from "@/features/admin/auth/utils/adminTokenStorage";
import {
  blockAdminUser,
  listAdminUsers,
  unblockAdminUser,
} from "@/features/admin/services/adminUserService";
import DashboardHeader from "@/features/dashboard/components/DashboardHeader";
import DashboardSection from "@/features/dashboard/components/DashboardSection";
import EmptyState from "@/features/dashboard/components/EmptyState";

const initialFilters = {
  role: "",
  accountStatus: "",
  kycStatus: "",
  search: "",
};
const roleOptions = ["", "SELLER", "JEWELLER"];
const accountStatusOptions = ["", "ACTIVE", "SUSPENDED", "DEACTIVATED"];
const kycStatusOptions = ["", "NOT_SUBMITTED", "PENDING", "APPROVED", "REJECTED"];

function hasPermission(admin, permission) {
  return admin?.isSuperAdmin || admin?.permissions?.includes(permission);
}

function normalizeValue(value) {
  const trimmed = String(value || "").trim();
  return trimmed || undefined;
}

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
  if (status === "ACTIVE" || status === "APPROVED" || status === "CLEAR") {
    return "bg-(--gw-color-gold)/14 text-(--gw-color-green)";
  }

  if (status === "SUSPENDED" || status === "REJECTED" || status === "LOCKED") {
    return "bg-(--gw-color-copper)/10 text-(--gw-color-copper)";
  }

  return "bg-(--gw-color-cream) text-(--gw-color-muted)";
}

function nextActionFor(user) {
  if (user.accountStatus === "ACTIVE") {
    return {
      label: "Block user",
      action: "block",
      permission: "admin.users.block",
      tone: "danger",
    };
  }

  return {
    label: "Unblock user",
    action: "unblock",
    permission: "admin.users.unblock",
    tone: "normal",
  };
}

export default function AdminUsersPage() {
  const { accessToken, admin } = useOutletContext();
  const navigate = useNavigate();
  const [filters, setFilters] = useState(initialFilters);
  const [appliedFilters, setAppliedFilters] = useState(initialFilters);
  const [users, setUsers] = useState([]);
  const [nextCursor, setNextCursor] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [busyId, setBusyId] = useState("");
  const [reasonDrafts, setReasonDrafts] = useState({});
  const [errorMessage, setErrorMessage] = useState("");
  const [statusMessage, setStatusMessage] = useState("");

  const handleAuthError = useCallback((error) => {
    if (error.status === 401) {
      clearAdminSession();
      navigate(ROUTES.adminLogin, { replace: true });
      return true;
    }

    return false;
  }, [navigate]);

  const summary = useMemo(
    () =>
      users.reduce(
        (totals, user) => ({
          total: totals.total + 1,
          sellers: totals.sellers + (user.role === "SELLER" ? 1 : 0),
          jewellers: totals.jewellers + (user.role === "JEWELLER" ? 1 : 0),
          blocked: totals.blocked + (user.accountStatus !== "ACTIVE" ? 1 : 0),
        }),
        { total: 0, sellers: 0, jewellers: 0, blocked: 0 },
      ),
    [users],
  );

  async function loadUsers({ cursor = "", append = false } = {}) {
    if (cursor) {
      setIsLoadingMore(true);
    } else {
      setIsLoading(true);
    }

    setErrorMessage("");

    try {
      const result = await listAdminUsers(accessToken, {
        role: normalizeValue(appliedFilters.role),
        accountStatus: normalizeValue(appliedFilters.accountStatus),
        kycStatus: normalizeValue(appliedFilters.kycStatus),
        search: normalizeValue(appliedFilters.search),
        cursor: normalizeValue(cursor),
        limit: 50,
      });
      const nextUsers = result?.data?.users || [];
      setUsers((current) => (append ? [...current, ...nextUsers] : nextUsers));
      setNextCursor(result?.data?.nextCursor || "");
    } catch (error) {
      if (handleAuthError(error)) {
        return;
      }

      setErrorMessage(error.message || "Unable to load users.");
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  }

  useEffect(() => {
    let isMounted = true;

    async function load() {
      setIsLoading(true);
      setErrorMessage("");

      try {
        const result = await listAdminUsers(accessToken, {
          role: normalizeValue(appliedFilters.role),
          accountStatus: normalizeValue(appliedFilters.accountStatus),
          kycStatus: normalizeValue(appliedFilters.kycStatus),
          search: normalizeValue(appliedFilters.search),
          limit: 50,
        });

        if (isMounted) {
          setUsers(result?.data?.users || []);
          setNextCursor(result?.data?.nextCursor || "");
        }
      } catch (error) {
        if (handleAuthError(error)) {
          return;
        }

        if (isMounted) {
          setErrorMessage(error.message || "Unable to load users.");
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
  }, [accessToken, appliedFilters, handleAuthError]);

  function submitFilters(event) {
    event.preventDefault();
    setAppliedFilters({
      role: filters.role,
      accountStatus: filters.accountStatus,
      kycStatus: filters.kycStatus,
      search: filters.search.trim(),
    });
  }

  function resetFilters() {
    setFilters(initialFilters);
    setAppliedFilters(initialFilters);
  }

  async function handleAccountAction(user) {
    const action = nextActionFor(user);
    const reason = String(reasonDrafts[user.id] || "").trim();

    if (!hasPermission(admin, action.permission)) {
      return;
    }

    if (reason.length < 5) {
      setErrorMessage("Reason must be at least 5 characters.");
      return;
    }

    setBusyId(user.id);
    setErrorMessage("");
    setStatusMessage("");

    try {
      if (action.action === "block") {
        await blockAdminUser(accessToken, user.id, { reason });
      } else {
        await unblockAdminUser(accessToken, user.id, { reason });
      }

      setReasonDrafts((current) => ({ ...current, [user.id]: "" }));
      setStatusMessage(
        action.action === "block"
          ? "User account blocked."
          : "User account unblocked.",
      );
      await loadUsers();
    } catch (error) {
      if (handleAuthError(error)) {
        return;
      }

      setErrorMessage(error.message || "Unable to update user account.");
    } finally {
      setBusyId("");
    }
  }

  return (
    <div className="space-y-6">
      <DashboardHeader
        eyebrow="Platform accounts"
        title="User management"
        description="Search sellers and jewellers, review verification posture, and block risky accounts with audit-tracked reasons."
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
        <SummaryTile label="Loaded users" value={summary.total} />
        <SummaryTile label="Sellers" value={summary.sellers} />
        <SummaryTile label="Jewellers" value={summary.jewellers} />
        <SummaryTile label="Blocked" value={summary.blocked} danger />
      </section>

      <DashboardSection
        title="Find users"
        description="Use role, status, and KYC filters to narrow operational review."
      >
        <form
          className="grid gap-3 lg:grid-cols-[10rem_12rem_12rem_1fr_auto_auto]"
          onSubmit={submitFilters}
        >
          <FilterSelect
            label="Role"
            value={filters.role}
            options={roleOptions}
            fallbackLabel="All roles"
            onChange={(value) =>
              setFilters((current) => ({ ...current, role: value }))
            }
          />
          <FilterSelect
            label="Account"
            value={filters.accountStatus}
            options={accountStatusOptions}
            fallbackLabel="All status"
            onChange={(value) =>
              setFilters((current) => ({ ...current, accountStatus: value }))
            }
          />
          <FilterSelect
            label="KYC"
            value={filters.kycStatus}
            options={kycStatusOptions}
            fallbackLabel="All KYC"
            onChange={(value) =>
              setFilters((current) => ({ ...current, kycStatus: value }))
            }
          />
          <label className="block text-sm font-semibold text-(--gw-color-green)">
            Search
            <input
              type="search"
              value={filters.search}
              maxLength={100}
              placeholder="Name, email, or phone"
              onChange={(event) =>
                setFilters((current) => ({
                  ...current,
                  search: event.target.value,
                }))
              }
              className="mt-2 h-11 w-full rounded-2xl border border-(--gw-color-border) bg-white px-4 text-sm outline-none transition placeholder:text-(--gw-color-muted)/60 focus:border-(--gw-color-gold) focus:ring-4 focus:ring-(--gw-color-gold)/15"
            />
          </label>
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
      </DashboardSection>

      <DashboardSection
        title="Users"
        description="Only seller and jeweller platform accounts are managed here."
        action={
          <button
            type="button"
            onClick={() => loadUsers()}
            disabled={isLoading}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-full border border-(--gw-color-border) bg-white px-4 text-sm font-semibold text-(--gw-color-green) transition hover:border-(--gw-color-gold) disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RotateCw className="h-4 w-4" aria-hidden="true" />
            Refresh
          </button>
        }
      >
        {isLoading ? (
          <p className="rounded-2xl bg-(--gw-color-cream) px-4 py-3 text-sm text-(--gw-color-muted)">
            Loading users...
          </p>
        ) : null}

        {!isLoading && users.length === 0 ? (
          <EmptyState
            icon={UsersRound}
            title="No users found"
            description="No seller or jeweller accounts match these filters."
          />
        ) : null}

        {!isLoading && users.length > 0 ? (
          <div className="space-y-4">
            {users.map((user) => {
              const action = nextActionFor(user);
              const canAct = hasPermission(admin, action.permission);

              return (
                <article
                  key={user.id}
                  className="rounded-2xl border border-(--gw-color-border) bg-white p-4"
                >
                  <div className="grid gap-4 xl:grid-cols-[1fr_21rem]">
                    <div className="min-w-0">
                      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                        <div className="min-w-0">
                          <p className="gw-break-text text-base font-semibold text-(--gw-color-green)">
                            {user.fullName || "Unnamed user"}
                          </p>
                          <p className="gw-break-text mt-1 text-sm text-(--gw-color-muted)">
                            {[user.email, user.phone].filter(Boolean).join(" / ") ||
                              user.id}
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <StatusBadge status={user.role} />
                          <StatusBadge status={user.accountStatus} />
                        </div>
                      </div>

                      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                        <DetailBlock label="KYC" value={user.kycStatus} />
                        <DetailBlock
                          label="Business"
                          value={user.businessVerificationStatus}
                        />
                        <DetailBlock
                          label="Commission"
                          value={
                            user.role === "JEWELLER"
                              ? `${user.commissionLockStatus} / ${formatMoney(user.pendingCommissionAmount)}`
                              : "Not applicable"
                          }
                        />
                        <DetailBlock
                          label="Activity"
                          value={`${user.listingCount} listings / ${user.bidCount} bids / ${user.dealCount} deals`}
                        />
                        <DetailBlock
                          label="Location"
                          value={[user.profileCity, user.profileState]
                            .filter(Boolean)
                            .join(", ")}
                        />
                        <DetailBlock label="Auth" value={user.authProvider} />
                        <DetailBlock
                          label="Email verified"
                          value={user.isEmailVerified ? "Yes" : "No"}
                        />
                        <DetailBlock label="Created" value={formatDate(user.createdAt)} />
                      </div>
                    </div>

                    <div className="rounded-2xl bg-(--gw-color-cream) p-4">
                      <div className="flex items-center gap-2 text-sm font-semibold text-(--gw-color-green)">
                        <ShieldAlert
                          className="h-4 w-4 text-(--gw-color-copper)"
                          aria-hidden="true"
                        />
                        Account control
                      </div>
                      {canAct ? (
                        <div className="mt-3 space-y-3">
                          <textarea
                            value={reasonDrafts[user.id] || ""}
                            onChange={(event) =>
                              setReasonDrafts((current) => ({
                                ...current,
                                [user.id]: event.target.value,
                              }))
                            }
                            rows={3}
                            maxLength={1000}
                            placeholder="Audit reason"
                            className="w-full resize-none rounded-2xl border border-(--gw-color-border) bg-white px-4 py-3 text-sm outline-none focus:border-(--gw-color-gold)"
                          />
                          <button
                            type="button"
                            onClick={() => handleAccountAction(user)}
                            disabled={busyId === user.id}
                            className={`h-10 w-full rounded-full px-4 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${
                              action.tone === "danger"
                                ? "bg-(--gw-color-copper) text-white hover:bg-(--gw-color-copper)/90"
                                : "bg-(--gw-color-green) text-(--gw-color-cream) hover:bg-(--gw-color-green-soft)"
                            }`}
                          >
                            {busyId === user.id ? "Updating..." : action.label}
                          </button>
                        </div>
                      ) : (
                        <p className="mt-3 text-sm leading-6 text-(--gw-color-muted)">
                          You do not have permission to change this account status.
                        </p>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        ) : null}

        {!isLoading && nextCursor ? (
          <div className="mt-5">
            <button
              type="button"
              onClick={() => loadUsers({ cursor: nextCursor, append: true })}
              disabled={isLoadingMore}
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

function SummaryTile({ label, value, danger = false }) {
  return (
    <div className="rounded-3xl border border-(--gw-color-border) bg-white p-5 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-(--gw-color-muted)">
        {label}
      </p>
      <p
        className={`mt-3 text-2xl font-semibold ${
          danger ? "text-(--gw-color-copper)" : "text-(--gw-color-green)"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function FilterSelect({ label, value, options, fallbackLabel, onChange }) {
  return (
    <label className="block text-sm font-semibold text-(--gw-color-green)">
      {label}
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 h-11 w-full rounded-2xl border border-(--gw-color-border) bg-white px-4 text-sm outline-none focus:border-(--gw-color-gold)"
      >
        {options.map((option) => (
          <option key={option || "ALL"} value={option}>
            {option || fallbackLabel}
          </option>
        ))}
      </select>
    </label>
  );
}

function StatusBadge({ status }) {
  return (
    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusClass(status)}`}>
      {status || "Not available"}
    </span>
  );
}

function DetailBlock({ label, value }) {
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
