import { createContext } from "react";

// AuthProvider owns the actual value; the default null lets useAuth fail fast
// when a component is rendered outside the provider.
export const AuthContext = createContext(null);
