import { ADMIN_AUDIT_ACTIONS, requestAuditMeta, writeAdminAuditLog } from "../modules/admin/admin.audit.js";
import { findAdminPermissions } from "../modules/admin/admin.repository.js";

function createForbiddenError() {
  const error = new Error("Forbidden");
  error.statusCode = 403;
  error.code = "ADMIN_PERMISSION_REQUIRED";
  return error;
}

export function requireAdminPermission(permissionKey) {
  return async (request, _response, next) => {
    try {
      if (request.admin?.mustChangePassword) {
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
        next();
        return;
      }

      const permissions = await findAdminPermissions(request.admin.id);

      if (permissions.includes(permissionKey)) {
        request.admin.permissions = permissions;
        next();
        return;
      }

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
