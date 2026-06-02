import { z } from "zod";

export const notificationQuerySchema = z.object({
  unreadOnly: z.preprocess((value) => {
    if (value === undefined || value === null || value === "") {
      return false;
    }

    return value === true || value === "true";
  }, z.boolean()),
  limit: z.coerce.number().int().positive().max(100).optional(),
});

export const notificationParamSchema = z.object({
  notificationId: z.string().uuid("Invalid notification id"),
});

export function validateQuery(schema, query) {
  const result = schema.safeParse(query);

  if (!result.success) {
    const error = new Error("Invalid query parameters");
    error.statusCode = 400;
    error.code = "VALIDATION_ERROR";
    error.details = result.error.flatten().fieldErrors;
    throw error;
  }

  return result.data;
}

export function validateParams(schema, params) {
  const result = schema.safeParse(params);

  if (!result.success) {
    const error = new Error("Invalid route parameters");
    error.statusCode = 400;
    error.code = "VALIDATION_ERROR";
    error.details = result.error.flatten().fieldErrors;
    throw error;
  }

  return result.data;
}
