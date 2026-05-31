import {
  getCurrentUser,
  updateCurrentUserLocation,
} from "./users.service.js";
import {
  updateLocationSchema,
  validateBody,
} from "./users.validation.js";

export async function me(request, response, next) {
  try {
    response.status(200).json(getCurrentUser(request.user));
  } catch (error) {
    next(error);
  }
}

export async function updateLocation(request, response, next) {
  try {
    const payload = validateBody(updateLocationSchema, request.body);

    response.status(200).json(
      await updateCurrentUserLocation({
        user: request.user,
        payload,
      }),
    );
  } catch (error) {
    next(error);
  }
}
