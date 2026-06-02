import { ShieldCheck, UserPlus, UsersRound } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";

import { ROUTES } from "@/constants/routes";
import { clearAdminSession } from "@/features/admin/auth/utils/adminTokenStorage";
import {
  createSubAdmin,
  listAdminRoles,
  listSubAdmins,
  updateSubAdminStatus,
} from "@/features/admin/services/adminSubAdminService";
import DashboardHeader from "@/features/dashboard/components/DashboardHeader";
import DashboardSection from "@/features/dashboard/components/DashboardSection";

const initialForm = {
  name: "",
  email: "",
  password: "",
  roleIds: [],
};

const statusOptions = [
  { value: "ACTIVE", label: "Activate" },
  { value: "SUSPENDED", label: "Suspend" },
  { value: "LOCKED", label: "Lock" },
];

function hasPermission(admin, permission) {
  return admin?.isSuperAdmin || admin?.permissions?.includes(permission);
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

function roleLabel(role) {
  return String(role?.name || "")
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function validateCreateForm(form) {
  const errors = {};

  if (form.name.trim().length < 2) {
    errors.name = "Name must be at least 2 characters.";
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
    errors.email = "Enter a valid email address.";
  }

  if (form.password.length < 12) {
    errors.password = "Password must be at least 12 characters.";
  }

  if (form.roleIds.length === 0) {
    errors.roleIds = "Select at least one role.";
  }

  return errors;
}

export default function AdminSubAdminsPage() {
  const { accessToken, admin } = useOutletContext();
  const navigate = useNavigate();
  const [subAdmins, setSubAdmins] = useState([]);
  const [roles, setRoles] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [formErrors, setFormErrors] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [statusDrafts, setStatusDrafts] = useState({});
  const [busyId, setBusyId] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [createdMfaSetup, setCreatedMfaSetup] = useState(null);
  const canCreate = hasPermission(admin, "admin.subadmins.create");
  const canSuspend = hasPermission(admin, "admin.subadmins.suspend");
  const assignableRoles = useMemo(
    () => roles.filter((role) => role.name !== "SUPER_ADMIN"),
    [roles],
  );

  const nonSuperAdmins = useMemo(
    () => subAdmins.filter((item) => !item.isSuperAdmin),
    [subAdmins],
  );

  async function loadSubAdmins() {
    setIsLoading(true);
    setErrorMessage("");

    try {
      const [subAdminResult, roleResult] = await Promise.all([
        listSubAdmins(accessToken),
        listAdminRoles(accessToken),
      ]);
      setSubAdmins(subAdminResult?.data || []);
      setRoles(roleResult?.data || []);
    } catch (error) {
      if (error.status === 401) {
        clearAdminSession();
        navigate(ROUTES.adminLogin, { replace: true });
        return;
      }

      setErrorMessage(error.message || "Unable to load sub-admins.");
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
        const [subAdminResult, roleResult] = await Promise.all([
          listSubAdmins(accessToken),
          listAdminRoles(accessToken),
        ]);

        if (isMounted) {
          setSubAdmins(subAdminResult?.data || []);
          setRoles(roleResult?.data || []);
        }
      } catch (error) {
        if (error.status === 401) {
          clearAdminSession();
          navigate(ROUTES.adminLogin, { replace: true });
          return;
        }

        if (isMounted) {
          setErrorMessage(error.message || "Unable to load sub-admins.");
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
  }, [accessToken, navigate]);

  function updateFormField(name, value) {
    setForm((current) => ({ ...current, [name]: value }));
    setFormErrors((current) => ({ ...current, [name]: "" }));
    setStatusMessage("");
  }

  function toggleRole(roleId) {
    setForm((current) => ({
      ...current,
      roleIds: current.roleIds.includes(roleId)
        ? current.roleIds.filter((item) => item !== roleId)
        : [...current.roleIds, roleId],
    }));
    setFormErrors((current) => ({ ...current, roleIds: "" }));
  }

  async function handleCreate(event) {
    event.preventDefault();

    if (!canCreate) {
      return;
    }

    const nextErrors = validateCreateForm(form);
    setFormErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    setIsCreating(true);
    setErrorMessage("");
    setStatusMessage("");

    try {
      const result = await createSubAdmin(accessToken, {
        name: form.name.trim(),
        email: form.email.trim().toLowerCase(),
        password: form.password,
        roleIds: form.roleIds,
      });
      setForm(initialForm);
      setCreatedMfaSetup(result?.data?.mfaSetup || null);
      setStatusMessage("Sub-admin created. They must change password on first login.");
      await loadSubAdmins();
    } catch (error) {
      if (error.status === 401) {
        clearAdminSession();
        navigate(ROUTES.adminLogin, { replace: true });
        return;
      }

      setErrorMessage(error.message || "Unable to create sub-admin.");
    } finally {
      setIsCreating(false);
    }
  }

  function updateStatusDraft(adminId, patch) {
    setStatusDrafts((current) => ({
      ...current,
      [adminId]: {
        status: current[adminId]?.status || "SUSPENDED",
        reason: current[adminId]?.reason || "",
        ...patch,
      },
    }));
  }

  async function handleStatusUpdate(targetAdmin) {
    const draft = statusDrafts[targetAdmin.id] || {};
    const nextStatus = draft.status || "SUSPENDED";
    const reason = String(draft.reason || "").trim();

    if (!canSuspend || targetAdmin.isSuperAdmin || targetAdmin.id === admin?.id) {
      return;
    }

    if (reason.length < 5) {
      setErrorMessage("Status change reason must be at least 5 characters.");
      return;
    }

    setBusyId(targetAdmin.id);
    setErrorMessage("");
    setStatusMessage("");

    try {
      await updateSubAdminStatus(accessToken, targetAdmin.id, {
        status: nextStatus,
        reason,
      });
      setStatusDrafts((current) => ({
        ...current,
        [targetAdmin.id]: { status: nextStatus, reason: "" },
      }));
      setStatusMessage("Sub-admin status updated.");
      await loadSubAdmins();
    } catch (error) {
      if (error.status === 401) {
        clearAdminSession();
        navigate(ROUTES.adminLogin, { replace: true });
        return;
      }

      setErrorMessage(error.message || "Unable to update sub-admin status.");
    } finally {
      setBusyId("");
    }
  }

  return (
    <div className="space-y-6">
      <DashboardHeader
        eyebrow="Admin access"
        title="Sub-admin management"
        description="Create and manage operational admin accounts with predefined RBAC roles."
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

      {createdMfaSetup ? (
        <div className="rounded-2xl border border-(--gw-color-gold)/40 bg-white px-4 py-3 text-sm text-(--gw-color-green)">
          <p className="font-semibold">One-time MFA setup</p>
          <p className="gw-break-text mt-2 text-(--gw-color-muted)">
            Secret: {createdMfaSetup.secret}
          </p>
          <p className="gw-break-text mt-1 text-(--gw-color-muted)">
            URI: {createdMfaSetup.otpauthUrl}
          </p>
        </div>
      ) : null}

      {canCreate ? (
        <DashboardSection
          title="Create sub-admin"
          description="Assign only the minimum role needed for this operator."
        >
          <form className="space-y-5" onSubmit={handleCreate} noValidate>
            <div className="grid gap-4 lg:grid-cols-3">
              <AdminInput
                id="sub-admin-name"
                label="Name"
                value={form.name}
                error={formErrors.name}
                disabled={isCreating}
                onChange={(value) => updateFormField("name", value)}
              />
              <AdminInput
                id="sub-admin-email"
                label="Email"
                type="email"
                value={form.email}
                error={formErrors.email}
                disabled={isCreating}
                onChange={(value) => updateFormField("email", value)}
              />
              <AdminInput
                id="sub-admin-password"
                label="Temporary password"
                type="password"
                value={form.password}
                error={formErrors.password}
                disabled={isCreating}
                onChange={(value) => updateFormField("password", value)}
              />
            </div>

            <div>
              <p className="text-sm font-semibold text-(--gw-color-green)">
                Roles
              </p>
              {formErrors.roleIds ? (
                <p className="mt-1 text-xs font-semibold text-(--gw-color-copper)">
                  {formErrors.roleIds}
                </p>
              ) : null}
              <div className="mt-3 grid gap-3 lg:grid-cols-2">
                {assignableRoles.map((role) => (
                  <label
                    key={role.id}
                    className="flex min-w-0 cursor-pointer gap-3 rounded-2xl border border-(--gw-color-border) bg-white p-4 transition hover:border-(--gw-color-gold)"
                  >
                    <input
                      type="checkbox"
                      checked={form.roleIds.includes(role.id)}
                      disabled={isCreating}
                      onChange={() => toggleRole(role.id)}
                      className="mt-1 h-4 w-4 shrink-0 accent-(--gw-color-green)"
                    />
                    <span className="min-w-0">
                      <span className="gw-break-text block text-sm font-semibold text-(--gw-color-green)">
                        {roleLabel(role)}
                      </span>
                      <span className="gw-break-text mt-1 block text-xs leading-5 text-(--gw-color-muted)">
                        {role.description || "No description available."}
                      </span>
                    </span>
                  </label>
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={isCreating}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-(--gw-color-green) px-5 text-sm font-semibold text-(--gw-color-cream) transition hover:bg-(--gw-color-green-soft) disabled:cursor-not-allowed disabled:opacity-70"
            >
              <UserPlus className="h-4 w-4" aria-hidden="true" />
              {isCreating ? "Creating..." : "Create sub-admin"}
            </button>
          </form>
        </DashboardSection>
      ) : null}

      <DashboardSection
        title="Admin accounts"
        description="Super-admin accounts are listed for visibility but cannot be changed here."
      >
        {isLoading ? (
          <p className="rounded-2xl bg-(--gw-color-cream) px-4 py-3 text-sm text-(--gw-color-muted)">
            Loading sub-admins...
          </p>
        ) : null}

        {!isLoading && nonSuperAdmins.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-(--gw-color-border) bg-(--gw-color-cream)/55 p-6 text-center">
            <UsersRound className="mx-auto h-8 w-8 text-(--gw-color-gold)" aria-hidden="true" />
            <h2 className="mt-3 text-lg font-semibold text-(--gw-color-green)">
              No sub-admins yet
            </h2>
            <p className="mt-1 text-sm text-(--gw-color-muted)">
              Created sub-admin accounts will appear here.
            </p>
          </div>
        ) : null}

        {!isLoading && nonSuperAdmins.length > 0 ? (
          <div className="space-y-4">
            {nonSuperAdmins.map((item) => {
              const draft = statusDrafts[item.id] || {};
              const canChangeStatus =
                canSuspend && !item.isSuperAdmin && item.id !== admin?.id;

              return (
                <article
                  key={item.id}
                  className="rounded-2xl border border-(--gw-color-border) bg-white p-4"
                >
                  <div className="grid gap-4 xl:grid-cols-[1fr_22rem]">
                    <div className="min-w-0">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0">
                          <p className="gw-break-text text-base font-semibold text-(--gw-color-green)">
                            {item.name}
                          </p>
                          <p className="gw-break-text mt-1 text-sm text-(--gw-color-muted)">
                            {item.email}
                          </p>
                        </div>
                        <span className="w-fit rounded-full bg-(--gw-color-cream) px-3 py-1 text-xs font-semibold text-(--gw-color-green)">
                          {item.status}
                        </span>
                      </div>

                      <div className="mt-4 grid gap-3 md:grid-cols-2">
                        <SmallDetail label="Last login" value={formatDate(item.lastLoginAt)} />
                        <SmallDetail label="Created" value={formatDate(item.createdAt)} />
                        <SmallDetail
                          label="Password change required"
                          value={item.mustChangePassword ? "Yes" : "No"}
                        />
                        <SmallDetail
                          label="Roles"
                          value={item.roles?.map(roleLabel).join(", ") || "No roles"}
                        />
                      </div>
                    </div>

                    <div className="rounded-2xl bg-(--gw-color-cream) p-4">
                      <div className="flex items-center gap-2 text-sm font-semibold text-(--gw-color-green)">
                        <ShieldCheck className="h-4 w-4 text-(--gw-color-gold)" aria-hidden="true" />
                        Status control
                      </div>
                      {canChangeStatus ? (
                        <div className="mt-3 space-y-3">
                          <select
                            value={draft.status || "SUSPENDED"}
                            onChange={(event) =>
                              updateStatusDraft(item.id, { status: event.target.value })
                            }
                            className="h-11 w-full rounded-2xl border border-(--gw-color-border) bg-white px-4 text-sm outline-none focus:border-(--gw-color-gold)"
                          >
                            {statusOptions.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                          <textarea
                            value={draft.reason || ""}
                            onChange={(event) =>
                              updateStatusDraft(item.id, { reason: event.target.value })
                            }
                            rows={3}
                            maxLength={1000}
                            className="w-full resize-none rounded-2xl border border-(--gw-color-border) bg-white px-4 py-3 text-sm outline-none focus:border-(--gw-color-gold)"
                            placeholder="Audit reason for this status change"
                          />
                          <button
                            type="button"
                            disabled={busyId === item.id}
                            onClick={() => handleStatusUpdate(item)}
                            className="h-10 w-full rounded-full bg-(--gw-color-green) px-4 text-sm font-semibold text-(--gw-color-cream) transition hover:bg-(--gw-color-green-soft) disabled:cursor-not-allowed disabled:opacity-70"
                          >
                            {busyId === item.id ? "Updating..." : "Update status"}
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
      </DashboardSection>
    </div>
  );
}

function AdminInput({
  id,
  label,
  value,
  onChange,
  disabled,
  error,
  type = "text",
}) {
  return (
    <label className="block min-w-0" htmlFor={id}>
      <span className="text-sm font-semibold text-(--gw-color-green)">
        {label}
      </span>
      <input
        id={id}
        type={type}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 h-12 w-full rounded-2xl border border-(--gw-color-border) bg-white px-4 text-sm text-(--gw-color-green) outline-none transition placeholder:text-(--gw-color-muted)/55 focus:border-(--gw-color-gold) focus:ring-4 focus:ring-(--gw-color-gold)/15 disabled:cursor-not-allowed disabled:bg-(--gw-color-border)/35"
      />
      {error ? (
        <span className="mt-1 block text-xs font-semibold text-(--gw-color-copper)">
          {error}
        </span>
      ) : null}
    </label>
  );
}

function SmallDetail({ label, value }) {
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
