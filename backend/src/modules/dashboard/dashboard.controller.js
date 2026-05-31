import {
  getJewellerDashboard,
  getSellerDashboard,
} from "./dashboard.service.js";

function toOptionalCoordinate(value) {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function readLocationQuery(query) {
  const latitude = toOptionalCoordinate(query.latitude);
  const longitude = toOptionalCoordinate(query.longitude);

  return {
    latitude,
    longitude,
  };
}

export async function sellerDashboard(request, response, next) {
  try {
    response.status(200).json(
      await getSellerDashboard(request.user, {
        location: readLocationQuery(request.query),
      }),
    );
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
