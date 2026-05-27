import { useMemo, useState } from "react";

import { AuthContext } from "@/features/auth/context/authContextValue";

const initialAuthState = {
  user: null,
  isAuthenticated: false,
};

export default function AuthProvider({ children }) {
  const [authState, setAuthState] = useState(initialAuthState);

  const value = useMemo(
    () => ({
      user: authState.user,
      isAuthenticated: authState.isAuthenticated,
      setAuthUser(user) {
        setAuthState({
          user,
          isAuthenticated: Boolean(user),
        });
      },
      clearAuthUser() {
        setAuthState(initialAuthState);
      },
    }),
    [authState],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
