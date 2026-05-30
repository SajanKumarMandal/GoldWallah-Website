import {
  getJewellerStats,
  getPendingCommissionSummary,
  getRecentActivity,
  getSellerStats,
} from "./dashboard.repository.js";

export async function getSellerDashboard(user) {
  return {
    success: true,
    data: {
      stats: await getSellerStats(user.id),
      recentActivity: await getRecentActivity(user.id),
      kycStatus: user.kycStatus,
    },
  };
}

export async function getJewellerDashboard(user) {
  const commissionSummary = await getPendingCommissionSummary(user.id);

  return {
    success: true,
    data: {
      stats: await getJewellerStats(user.id),
      recentActivity: await getRecentActivity(user.id),
      kycStatus: user.kycStatus,
      businessVerificationStatus: user.businessVerificationStatus,
      commissionLockStatus: user.commissionLockStatus,
      commissionSummary,
    },
  };
}
