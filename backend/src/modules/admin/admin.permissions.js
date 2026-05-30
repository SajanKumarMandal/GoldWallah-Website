export const ADMIN_ROLES = {
  superAdmin: "SUPER_ADMIN",
  kycReviewer: "KYC_REVIEWER",
  businessVerificationReviewer: "BUSINESS_VERIFICATION_REVIEWER",
  supportAdmin: "SUPPORT_ADMIN",
  financeAdmin: "FINANCE_ADMIN",
  fraudReviewer: "FRAUD_REVIEWER",
};

export const ADMIN_PERMISSIONS = [
  "admin.dashboard.view",
  "admin.users.view",
  "admin.sellers.view",
  "admin.jewellers.view",
  "admin.kyc.seller.view",
  "admin.kyc.seller.approve",
  "admin.kyc.seller.reject",
  "admin.kyc.jeweller.view",
  "admin.kyc.jeweller.approve",
  "admin.kyc.jeweller.reject",
  "admin.business.view",
  "admin.business.approve",
  "admin.business.reject",
  "admin.subadmins.view",
  "admin.subadmins.create",
  "admin.subadmins.update",
  "admin.subadmins.suspend",
  "admin.roles.view",
  "admin.roles.update",
  "admin.audit.view",
  "admin.users.block",
  "admin.users.unblock",
];

export const SYSTEM_ROLE_DEFINITIONS = [
  {
    name: ADMIN_ROLES.superAdmin,
    description: "Full platform administration access.",
    permissions: ADMIN_PERMISSIONS,
  },
  {
    name: ADMIN_ROLES.kycReviewer,
    description: "Seller and jeweller KYC review access.",
    permissions: [
      "admin.users.view",
      "admin.sellers.view",
      "admin.jewellers.view",
      "admin.kyc.seller.view",
      "admin.kyc.seller.approve",
      "admin.kyc.seller.reject",
      "admin.kyc.jeweller.view",
      "admin.kyc.jeweller.approve",
      "admin.kyc.jeweller.reject",
    ],
  },
  {
    name: ADMIN_ROLES.businessVerificationReviewer,
    description: "Jeweller business verification review access.",
    permissions: [
      "admin.jewellers.view",
      "admin.business.view",
      "admin.business.approve",
      "admin.business.reject",
    ],
  },
  {
    name: ADMIN_ROLES.supportAdmin,
    description: "Support visibility into users and marketplace participants.",
    permissions: [
      "admin.users.view",
      "admin.sellers.view",
      "admin.jewellers.view",
    ],
  },
  {
    name: ADMIN_ROLES.financeAdmin,
    description: "Finance support access for users and audit visibility.",
    permissions: [
      "admin.users.view",
      "admin.jewellers.view",
      "admin.audit.view",
    ],
  },
  {
    name: ADMIN_ROLES.fraudReviewer,
    description: "Fraud and account safety review access.",
    permissions: [
      "admin.users.view",
      "admin.sellers.view",
      "admin.jewellers.view",
      "admin.audit.view",
      "admin.users.block",
      "admin.users.unblock",
    ],
  },
];

export function isKnownAdminPermission(permissionKey) {
  return ADMIN_PERMISSIONS.includes(permissionKey);
}
