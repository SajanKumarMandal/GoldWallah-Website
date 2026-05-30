import { lazy, Suspense } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";

import { ROUTES } from "@/constants/routes";
import { USER_ROLES } from "@/constants/roles";
import DashboardLayout from "@/features/dashboard/layouts/DashboardLayout";
import PublicLayout from "@/layouts/PublicLayout";
import NotFound from "@/pages/NotFound";
import ProtectedRoute from "@/routes/ProtectedRoute";
import RoleRoute from "@/routes/RoleRoute";

const Home = lazy(() => import("@/pages/Home"));
const LoginPage = lazy(() => import("@/features/auth/pages/LoginPage"));
const RegisterPage = lazy(() => import("@/features/auth/pages/RegisterPage"));
const SellerDashboardPage = lazy(
  () => import("@/features/dashboard/pages/SellerDashboardPage"),
);
const SellerKycPage = lazy(() => import("@/features/seller/pages/SellerKycPage"));
const SellerListingsPage = lazy(
  () => import("@/features/seller/pages/SellerListingsPage"),
);
const CreateListingPage = lazy(
  () => import("@/features/seller/pages/CreateListingPage"),
);
const SellerListingDetailPage = lazy(
  () => import("@/features/seller/pages/SellerListingDetailPage"),
);
const AdminKycListPage = lazy(
  () => import("@/features/admin/pages/AdminKycListPage"),
);
const AdminKycDetailPage = lazy(
  () => import("@/features/admin/pages/AdminKycDetailPage"),
);
const JewellerDashboardPage = lazy(
  () => import("@/features/dashboard/pages/JewellerDashboardPage"),
);
const JewellerVerificationPage = lazy(
  () => import("@/features/jeweller/pages/JewellerVerificationPage"),
);

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
                  path={ROUTES.sellerDashboard}
                  element={<SellerDashboardPage />}
                />
                <Route
                  path={ROUTES.sellerListings}
                  element={<SellerListingsPage />}
                />
                <Route
                  path={ROUTES.sellerNewListing}
                  element={<CreateListingPage />}
                />
                <Route
                  path={ROUTES.sellerListingDetail}
                  element={<SellerListingDetailPage />}
                />
              </Route>
            </Route>

            <Route
              element={<RoleRoute allowedRoles={[USER_ROLES.admin]} />}
            >
              <Route element={<DashboardLayout />}>
                <Route path={ROUTES.adminDashboard} element={<AdminKycListPage />} />
                <Route path={ROUTES.adminKyc} element={<AdminKycListPage />} />
                <Route
                  path={ROUTES.adminKycDetail}
                  element={<AdminKycDetailPage />}
                />
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
                  path={ROUTES.jewellerDashboard}
                  element={<JewellerDashboardPage />}
                />
              </Route>
            </Route>
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
