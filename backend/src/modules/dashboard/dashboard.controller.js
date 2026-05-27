import {
  getJewellerDashboard,
  getSellerDashboard,
} from "./dashboard.service.js";

export async function sellerDashboard(request, response, next) {
  try {
    response.status(200).json(await getSellerDashboard(request.user));
  } catch (error) {
    next(error);
  }
}

export async function jewellerDashboard(request, response, next) {
  try {
    response.status(200).json(await getJewellerDashboard(request.user));
  } catch (error) {
    next(error);
  }
}
