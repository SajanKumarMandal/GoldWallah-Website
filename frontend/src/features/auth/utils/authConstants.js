export const AUTH_ROLES = {
  seller: "seller",
  jeweller: "jeweller",
};

export const DEFAULT_REGISTER_ROLE = AUTH_ROLES.seller;

export const AUTH_METHODS = {
  email: "email",
  mobile: "mobile",
};

export const ROLE_API_VALUES = {
  [AUTH_ROLES.seller]: "SELLER",
  [AUTH_ROLES.jeweller]: "JEWELLER",
};

export function normalizeAuthRole(role) {
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
  return Boolean(normalizeAuthRole(role));
}

export function toApiRole(role) {
  const normalizedRole = normalizeAuthRole(role);

  if (!normalizedRole) {
    throw new Error("Choose a valid account role.");
  }

  return ROLE_API_VALUES[normalizedRole];
}
