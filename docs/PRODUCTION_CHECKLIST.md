# GoldWallah Production Checklist

## Required Environment

- `NODE_ENV=production`
- `DATABASE_URL`
- `JWT_ACCESS_SECRET`
- `JWT_REFRESH_SECRET`
- `KYC_ENCRYPTION_KEY`
- `ADMIN_JWT_ACCESS_SECRET`
- `PRIVATE_MEDIA_SIGNING_SECRET`
- `FRONTEND_ORIGIN`
- `FRONTEND_URL`
- `PG_SSL_CA_FILE` or `PG_SSL_CA` from the PostgreSQL provider
- `OTP_PROVIDER` must be `msg91` or `twilio` in production
- Shared persistent storage or object storage for public listing media mounted behind `/uploads/listings`

## Deploy Steps

1. Install locked dependencies with `npm ci` in `backend` and `frontend`.
2. Run backend migrations with `npm run db:migrate`.
3. Build the frontend with `npm run build`.
4. Start the backend with `npm start`.
5. Serve the frontend build behind HTTPS.

## Security Verification

- Confirm `/uploads/listings/...` is public.
- Confirm `/uploads/kyc/...` and `/uploads/jeweller-verifications/...` are not served.
- Confirm private document previews use `/api/v1/media/private/...` signed URLs.
- Confirm admin KYC/business detail views create admin audit log rows.
- Confirm user refresh tokens are set only as HttpOnly cookies.
- Confirm Postgres TLS uses certificate verification.
- Confirm mock OTP and placeholder OAuth flows are disabled in production.
- Confirm listing uploads are not stored on ephemeral per-instance disk in multi-server production.
- Confirm Meta app publishing requirements are complete before public Facebook Login: app icon, privacy policy URL, user data deletion URL, and category.
- Confirm Google OAuth production origins include the final frontend domain.

## Marketplace Smoke Test

1. Register a seller, approve KYC, and create a listing.
2. Register a jeweller, approve KYC and business verification.
3. Open jeweller marketplace and place a private bid.
4. Open seller listing detail and accept or reject the bid.
5. Confirm accepted listing status changes to `BID_ACCEPTED`.
6. Confirm a deal record is visible to seller and jeweller.
7. Mark the platform commission paid or waived as an admin.
8. Confirm the jeweller commission lock clears and the seller can mark the deal completed.
9. Confirm the completed listing status changes to `SOLD`.
