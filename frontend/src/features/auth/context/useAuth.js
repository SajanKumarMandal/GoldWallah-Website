import { useContext } from "react";

import { AuthContext } from "@/features/auth/context/authContextValue";

// Typed-by-convention hook for auth consumers. Throwing here catches missing
// AuthProvider wiring during development instead of returning unsafe null state.
export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }

  return context;
}
