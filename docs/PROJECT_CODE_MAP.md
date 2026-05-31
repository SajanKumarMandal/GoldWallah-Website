# GoldWallah Code Map

This file is a quick guide for where the main production features live.

## Backend

- `backend/src/server.js` starts the API process.
- `backend/src/app.js` configures Express middleware, health check, public listing images, API routes, and error handling.
- `backend/src/routes/apiRouter.js` mounts every backend module under `/api/v1`.
- `backend/src/config/env.js` validates environment variables and blocks unsafe production defaults.
- `backend/src/config/db.js` owns the PostgreSQL pool and transaction helper.
- `backend/src/middleware/auth.js` validates normal user access tokens.
- `backend/src/middleware/adminAuth.js` validates admin access tokens.
- `backend/src/middleware/requireAdminPermission.js` enforces admin RBAC permissions and audits denied access.
- `backend/src/modules/auth` owns user registration, login, OTP, refresh token rotation, and logout.
- `backend/src/modules/admin` owns admin login, admin refresh token rotation, RBAC roles, and sub-admin management.
- `backend/src/modules/kyc` owns seller KYC submission, encrypted identity fields, private KYC media, and admin KYC review.
- `backend/src/modules/jewellerVerification` owns jeweller business verification, encrypted GST/license data, location, and transaction gating.
- `backend/src/modules/media` serves private KYC/business files only after signed URL and authorization checks.
- `backend/src/modules/listings` owns seller gold listings and public listing images.
- `backend/src/modules/bids` owns private jeweller bids, seller bid decisions, deal creation, and commission creation.
- `backend/src/modules/deals` owns seller/jeweller deal visibility and seller completion after commission clearance.
- `backend/src/modules/notifications` owns durable user notifications.
- `backend/src/modules/adminCommissions` owns finance/admin commission settlement and jeweller unlock logic.
- `backend/src/modules/geoMatching` owns nearby listing ranking and nearest fallback logic.
- `backend/src/modules/adminDashboard` owns admin summary, pending verification, audit, and alert widgets.

## Frontend

- `frontend/src/app/router.jsx` defines all public, admin, seller, and jeweller routes.
- `frontend/src/services/httpClient.js` is the shared API wrapper.
- `frontend/src/features/auth` owns user login/register and frontend auth state.
- `frontend/src/features/dashboard/layouts/DashboardLayout.jsx` is the shared seller/jeweller dashboard shell.
- `frontend/src/features/seller` owns seller KYC, listings, listing detail, and seller bid decisions.
- `frontend/src/features/jeweller` owns jeweller verification and geo-matched marketplace bidding.
- `frontend/src/features/deals` owns seller/jeweller deal tracking and seller completion.
- `frontend/src/features/notifications` owns notification API calls used by the dashboard shell.
- `frontend/src/features/admin` owns admin login, dashboard, KYC review, and commission settlement.

## Security Notes

- Listing images are intentionally public under `/uploads/listings`.
- KYC, selfie, GST, license, and business verification documents must never be exposed through static middleware.
- Full identity/business document views are protected by admin/user authorization and audited for admin review screens.
- Production OTP must not use `mock`.
- Production PostgreSQL SSL must verify certificates using the provider CA.
