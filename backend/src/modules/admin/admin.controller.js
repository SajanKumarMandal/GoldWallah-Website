import { requestAuditMeta } from "./admin.audit.js";
import {
  createSubAdmin,
  changeAdminPassword,
  getCurrentAdmin,
  getSubAdmins,
  loginAdmin,
  logoutAdmin,
  refreshAdminSession,
  updateSubAdminStatus,
} from "./admin.service.js";
import {
  adminIdParamSchema,
  adminLoginSchema,
  adminLogoutSchema,
  adminRefreshSchema,
  changePasswordSchema,
  createSubAdminSchema,
  updateAdminStatusSchema,
  validateBody,
  validateParams,
} from "./admin.validation.js";

function sendSuccess(response, result, statusCode = 200) {
  response.status(statusCode).json(result);
}

export async function login(request, response, next) {
  try {
    const payload = validateBody(adminLoginSchema, request.body);
    sendSuccess(
      response,
      await loginAdmin({ payload, requestMeta: requestAuditMeta(request) }),
    );
  } catch (error) {
    next(error);
  }
}

export async function refresh(request, response, next) {
  try {
    const payload = validateBody(adminRefreshSchema, request.body);
    sendSuccess(
      response,
      await refreshAdminSession({
        refreshToken: payload.refreshToken,
        requestMeta: requestAuditMeta(request),
      }),
    );
  } catch (error) {
    next(error);
  }
}

export async function logout(request, response, next) {
  try {
    const payload = validateBody(adminLogoutSchema, request.body);
    sendSuccess(
      response,
      await logoutAdmin({
        admin: request.admin,
        refreshToken: payload.refreshToken,
        requestMeta: requestAuditMeta(request),
      }),
    );
  } catch (error) {
    next(error);
  }
}

export async function me(request, response, next) {
  try {
    sendSuccess(response, await getCurrentAdmin(request.admin));
  } catch (error) {
    next(error);
  }
}

export async function changePassword(request, response, next) {
  try {
    const payload = validateBody(changePasswordSchema, request.body);
    sendSuccess(
      response,
      await changeAdminPassword({
        admin: request.admin,
        payload,
        requestMeta: requestAuditMeta(request),
      }),
    );
  } catch (error) {
    next(error);
  }
}

export async function listSubAdmins(_request, response, next) {
  try {
    sendSuccess(response, await getSubAdmins());
  } catch (error) {
    next(error);
  }
}

export async function createSubAdminHandler(request, response, next) {
  try {
    const payload = validateBody(createSubAdminSchema, request.body);
    sendSuccess(
      response,
      await createSubAdmin({
        actorAdmin: request.admin,
        payload,
        requestMeta: requestAuditMeta(request),
      }),
      201,
    );
  } catch (error) {
    next(error);
  }
}

export async function updateSubAdminStatusHandler(request, response, next) {
  try {
    const { id } = validateParams(adminIdParamSchema, request.params);
    const payload = validateBody(updateAdminStatusSchema, request.body);
    sendSuccess(
      response,
      await updateSubAdminStatus({
        actorAdmin: request.admin,
        adminId: id,
        payload,
        requestMeta: requestAuditMeta(request),
      }),
    );
  } catch (error) {
    next(error);
  }
}
