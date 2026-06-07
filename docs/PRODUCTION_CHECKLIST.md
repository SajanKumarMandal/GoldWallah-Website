# GoldWallah Production Checklist

## Required Environment

- `NODE_ENV=production`
- `DATABASE_URL`
- `REDIS_URL`
- `JWT_ACCESS_SECRET`
- `JWT_REFRESH_SECRET`
- `KYC_ENCRYPTION_KEY`
- `KYC_IDENTITY_HASH_SECRET`
- `ADMIN_JWT_ACCESS_SECRET`
- `ADMIN_SEED_MFA_SECRET` when seeding the first production admin
- `PRIVATE_MEDIA_SIGNING_SECRET`
- `FRONTEND_ORIGIN`
- `FRONTEND_URL`
- `AUTH_COOKIE_DOMAIN` when frontend and backend are served from sibling subdomains
- `PG_SSL_CA_FILE` or `PG_SSL_CA` from the PostgreSQL provider
- `OTP_PROVIDER` must be `msg91` or `twilio` in production
- For Twilio OTP, set `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_VERIFY_SERVICE_SID`, and `OTP_RATE_LIMIT_HASH_SECRET`
- Redis/Key Value must be private-network only, authentication protected when supported, and configured with `noeviction` for BullMQ safety
- `BULLMQ_WORKER_ENABLED=true`
- `NOTIFICATION_QUEUE_CONCURRENCY` sized for the backend instance class
- `NOTIFICATION_STREAM_HEARTBEAT_SECONDS` lower than the load balancer idle timeout
- Shared persistent storage or object storage for public listing media mounted behind `/uploads/listings`
- `LOCAL_UPLOAD_STORAGE_PRODUCTION_ACK=shared-persistent-storage-mounted` only after `/backend/uploads` is backed by shared persistent storage or replaced by object storage

## Deploy Steps

1. Install locked dependencies with `npm ci` in `backend` and `frontend`.
2. Run backend migrations with `npm run db:migrate`.
3. Build the frontend with `npm run build`.
4. Start the backend with `npm start`.
5. Serve the frontend build behind HTTPS.
6. Verify `VITE_API_BASE_URL` points at the HTTPS backend `/api/v1` URL.
7. Verify `/health/ready` returns `postgres: ready` and `redis: ready`.

## Security Verification

- Confirm `/uploads/listings/...` is public.
- Confirm `/uploads/kyc/...` and `/uploads/jeweller-verifications/...` are not served.
- Confirm private document previews use `/api/v1/media/private/...` signed URLs.
- Confirm admin KYC/business detail views create admin audit log rows.
- Confirm approved Aadhaar/PAN/GST/license identities cannot be approved twice.
- Confirm user refresh tokens are set only as HttpOnly cookies.
- Confirm every production admin account has MFA enabled before launch.
- Confirm user and admin refresh/logout endpoints clear cookies and rotate sessions from cookies only.
- Confirm Postgres TLS uses certificate verification.
- Confirm mock OTP and placeholder OAuth flows are disabled in production.
- Confirm Twilio is upgraded from Trial before launch; Trial accounts can only send OTPs to verified recipient numbers.
- Confirm Twilio Verify Fraud Guard is enabled, Geo Permissions allow only supported launch countries, and usage/conversion alerts are monitored.
- Confirm Redis-backed rate limits are active across at least two backend instances.
- Confirm BullMQ notification jobs retry failed delivery and completed jobs are pruned.
- Confirm realtime notification streams require user auth and never include KYC/business document URLs or private bid amounts.
- Confirm listing uploads are not stored on ephemeral per-instance disk in multi-server production.
- Confirm backend startup fails in production without the local upload storage acknowledgement.
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
