import { listAdminAuditLogs } from "./auditLogs.repository.js";

function createError(message, statusCode, code) {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.code = code;
  return error;
}

function encodeCursor(row) {
  if (!row?.created_at || !row?.id) {
    return null;
  }

  return Buffer.from(
    JSON.stringify({
      createdAt: row.created_at,
      id: row.id,
    }),
  ).toString("base64url");
}

function decodeCursor(cursor) {
  if (!cursor) {
    return null;
  }

  try {
    const parsed = JSON.parse(Buffer.from(cursor, "base64url").toString("utf8"));

    if (
      !parsed?.createdAt ||
      Number.isNaN(Date.parse(parsed.createdAt)) ||
      !/^[0-9a-fA-F-]{36}$/.test(parsed.id || "")
    ) {
      throw new Error("Invalid cursor");
    }

    return parsed;
  } catch {
    throw createError("Invalid cursor", 400, "INVALID_CURSOR");
  }
}

function normalizeDate(value) {
  return value ? new Date(value).toISOString() : undefined;
}

export async function getAdminAuditLogs(filters = {}) {
  const result = await listAdminAuditLogs({
    ...filters,
    from: normalizeDate(filters.from),
    to: normalizeDate(filters.to),
    cursor: decodeCursor(filters.cursor),
  });

  return {
    success: true,
    data: {
      logs: result.logs,
      nextCursor: encodeCursor(result.nextCursor),
      hasMore: result.hasMore,
    },
  };
}
