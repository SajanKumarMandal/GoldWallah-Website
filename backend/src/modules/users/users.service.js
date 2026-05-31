import { updateUserProfileLocation } from "./users.repository.js";

export function getCurrentUser(user) {
  return {
    success: true,
    data: user,
  };
}

export async function updateCurrentUserLocation({ user, payload }) {
  return {
    success: true,
    data: await updateUserProfileLocation(user.id, payload),
  };
}
