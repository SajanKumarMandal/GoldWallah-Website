import { withTransaction } from "../../config/db.js";
import { updateUserProfileLocation } from "./users.repository.js";

export function getCurrentUser(user) {
  return {
    success: true,
    data: user,
  };
}

export async function updateCurrentUserLocation({ user, payload }) {
  const updatedUser = await withTransaction(async (client) => {
    const nextUser = await updateUserProfileLocation(user.id, payload, client);

    return nextUser;
  });

  return {
    success: true,
    data: updatedUser,
  };
}
