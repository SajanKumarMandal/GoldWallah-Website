import { validateRequiredEnv } from "@/config/env";

validateRequiredEnv();

export default function AppProviders({ children }) {
  return children;
}
