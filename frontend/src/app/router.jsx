import { lazy, Suspense } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";

import { ROUTES } from "@/constants/routes";
import { USER_ROLES } from "@/constants/roles";
import DashboardLayout from "@/features/dashboard/layouts/DashboardLayout";
import PublicLayout from "@/layouts/PublicLayout";
import NotFound from "@/pages/NotFound";
import ProtectedRoute from "@/routes/ProtectedRoute";
import RoleRoute from "@/routes/RoleRoute";
import VerificationRoute from "@/routes/VerificationRoute";

const Home = lazy(() => import("@/pages/Home"));
const LoginPage = lazy(() => import("@/features/auth/pages/LoginPage"));
const RegisterPage = lazy(() => import("@/features/auth/pages/RegisterPage"));
const SellerDashboardPage = lazy(
  () => import("@/features/dashboard/pages/SellerDashboardPage"),
);
const SellerKycPage = lazy(() => import("@/features/dashboard/pages/SellerKycPage"));
const JewellerDashboardPage = lazy(
  () => import("@/features/dashboard/pages/JewellerDashboardPage"),
);
const JewellerVerificationPage = lazy(
  () => import("@/features/dashboard/pages/JewellerVerificationPage"),
);

function hasApprovedKyc(user) {
  return user?.kycStatus === "APPROVED";
}

function hasApprovedJewellerVerification(user) {
  return (
    user?.kycStatus === "APPROVED" &&
    user?.businessVerificationStatus === "APPROVED"
  );
}

function RouteLoader() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-(--gw-color-cream) text-(--gw-color-green)">
      Loading GoldWallah...
    </div>
  );
}

export default function AppRouter() {
  return (
    <BrowserRouter>
      <Suspense fallback={<RouteLoader />}>
        <Routes>
          <Route element={<PublicLayout />}>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
          </Route>

          <Route element={<ProtectedRoute />}>
            <Route
              element={<RoleRoute allowedRoles={[USER_ROLES.seller]} />}
            >
              <Route element={<DashboardLayout />}>
                <Route path={ROUTES.sellerKyc} element={<SellerKycPage />} />
                <Route
                  element={
                    <VerificationRoute
                      isVerified={hasApprovedKyc}
                      redirectTo={ROUTES.sellerKyc}
                    />
                  }
                >
                  <Route
                    path={ROUTES.sellerDashboard}
                    element={<SellerDashboardPage />}
                  />
                </Route>
              </Route>
            </Route>

            <Route
              element={<RoleRoute allowedRoles={[USER_ROLES.jeweller]} />}
            >
              <Route element={<DashboardLayout />}>
                <Route
                  path={ROUTES.jewellerVerification}
                  element={<JewellerVerificationPage />}
                />
                <Route
                  element={
                    <VerificationRoute
                      isVerified={hasApprovedJewellerVerification}
                      redirectTo={ROUTES.jewellerVerification}
                    />
                  }
                >
                  <Route
                    path={ROUTES.jewellerDashboard}
                    element={<JewellerDashboardPage />}
                  />
                </Route>
              </Route>
            </Route>
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
