// UI-facing auth role values stay lowercase so they work cleanly in query
// params, radio values, and component state.
export const AUTH_ROLES = {
  seller: "seller",
  jeweller: "jeweller",
};

export const DEFAULT_REGISTER_ROLE = AUTH_ROLES.seller;

// Supported browser auth methods for login and registration forms.
export const AUTH_METHODS = {
  email: "email",
  mobile: "mobile",
};

// Backend validation expects uppercase enum values for user roles.
export const ROLE_API_VALUES = {
  [AUTH_ROLES.seller]: "SELLER",
  [AUTH_ROLES.jeweller]: "JEWELLER",
};

export function normalizeAuthRole(role) {
  // Normalize URL params, radio values, and the alternate "jeweler" spelling
  // into the canonical UI role values.
  if (typeof role !== "string") {
    return "";
  }

  const normalizedRole = role.trim().toLowerCase();

  if (normalizedRole === AUTH_ROLES.seller) {
    return AUTH_ROLES.seller;
  }

  if (normalizedRole === AUTH_ROLES.jeweller || normalizedRole === "jeweler") {
    return AUTH_ROLES.jeweller;
  }

  return "";
}

export function isValidAuthRole(role) {
  // Shared predicate used by form validation before an API request is made.
  return Boolean(normalizeAuthRole(role));
}

export function toApiRole(role) {
  // Convert UI role to backend enum and fail closed if the role is invalid.
  const normalizedRole = normalizeAuthRole(role);

  if (!normalizedRole) {
    throw new Error("Choose a valid account role.");
  }

  return ROLE_API_VALUES[normalizedRole];
}
