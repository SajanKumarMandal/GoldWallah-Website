import { validateRequiredEnv } from "@/config/env";
import AuthProvider from "@/features/auth/context/AuthProvider";

validateRequiredEnv();

export default function AppProviders({ children }) {
  return <AuthProvider>{children}</AuthProvider>;
}
