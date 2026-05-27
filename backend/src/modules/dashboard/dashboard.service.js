import {
  getJewellerStats,
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
  return {
    success: true,
    data: {
      stats: await getJewellerStats(user.id),
      recentActivity: await getRecentActivity(user.id),
      kycStatus: user.kycStatus,
      businessVerificationStatus: user.businessVerificationStatus,
    },
  };
}
