import { getCurrentUser } from "./users.service.js";

export async function me(request, response, next) {
  try {
    response.status(200).json(getCurrentUser(request.user));
  } catch (error) {
    next(error);
  }
}
