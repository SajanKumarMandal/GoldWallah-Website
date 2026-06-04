import { ADMIN_AUDIT_ACTIONS, requestAuditMeta, writeAdminAuditLog } from "../modules/admin/admin.audit.js";
import { findAdminPermissions } from "../modules/admin/admin.repository.js";

// RBAC guard for admin routes. Super admins pass automatically; denied access is
// written to the admin audit log for security review.
function createForbiddenError() {
  // Permission failures return a generic forbidden response after audit logging.
  const error = new Error("Forbidden");
  error.statusCode = 403;
  error.code = "ADMIN_PERMISSION_REQUIRED";
  return error;
}

export function requireAdminPermission(permissionKey) {
  // Factory keeps each route explicit about the exact permission it requires.
  return async (request, _response, next) => {
    try {
      if (request.admin?.mustChangePassword) {
        // Temporary-password admins cannot use privileged routes before changing
        // the password, even if they otherwise have the permission.
        await writeAdminAuditLog({
          actorAdminId: request.admin.id,
          action: ADMIN_AUDIT_ACTIONS.permissionDenied,
          resourceType: "ADMIN_PERMISSION",
          resourceId: permissionKey,
          reason: "password_change_required",
          severity: "WARNING",
          requestMeta: requestAuditMeta(request),
        });

        const error = new Error("Password change required");
        error.statusCode = 403;
        error.code = "ADMIN_PASSWORD_CHANGE_REQUIRED";
        next(error);
        return;
      }

      if (request.admin?.isSuperAdmin) {
        // Super admins bypass granular permission lookup by policy.
        next();
        return;
      }

      const permissions = await findAdminPermissions(request.admin.id);

      if (permissions.includes(permissionKey)) {
        // Attach permissions for downstream handlers/UI context when access is allowed.
        request.admin.permissions = permissions;
        next();
        return;
      }

      // Missing permission is security-relevant and always audited.
      await writeAdminAuditLog({
        actorAdminId: request.admin.id,
        action: ADMIN_AUDIT_ACTIONS.permissionDenied,
        resourceType: "ADMIN_PERMISSION",
        resourceId: permissionKey,
        reason: "missing_permission",
        severity: "WARNING",
        requestMeta: requestAuditMeta(request),
      });

      next(createForbiddenError());
    } catch (error) {
      next(error);
    }
  };
}
