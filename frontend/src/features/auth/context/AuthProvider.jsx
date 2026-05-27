import { useCallback, useMemo, useState } from "react";

import { AuthContext } from "@/features/auth/context/authContextValue";

const initialAuthState = {
  user: null,
  accessToken: null,
  isAuthenticated: false,
};

export default function AuthProvider({ children }) {
  const [authState, setAuthState] = useState(initialAuthState);
  const setAuthUser = useCallback((user) => {
    setAuthState((currentState) => ({
      user,
      accessToken: currentState.accessToken,
      isAuthenticated: Boolean(user),
    }));
  }, []);

  const setAuthSession = useCallback(({ user, accessToken }) => {
    setAuthState({
      user,
      accessToken: accessToken || null,
      isAuthenticated: Boolean(user),
    });
  }, []);

  const clearAuthUser = useCallback(() => {
    setAuthState(initialAuthState);
  }, []);

  const value = useMemo(
    () => ({
      user: authState.user,
      accessToken: authState.accessToken,
      isAuthenticated: authState.isAuthenticated,
      setAuthUser,
      setAuthSession,
      clearAuthUser,
    }),
    [authState, clearAuthUser, setAuthSession, setAuthUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
