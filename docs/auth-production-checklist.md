# GoldWallah Auth Production Checklist

## Local Setup

- Backend: copy `backend/.env.example` to `backend/.env` and use local-only secrets with at least 32 characters.
- Frontend: copy `frontend/.env.example` to `frontend/.env`.
- Use `EMAIL_PROVIDER=mock` and `OTP_PROVIDER=mock` only outside production.
- Run Redis locally when testing production-like rate limiting: `REDIS_URL=redis://:goldwallah-local-redis-change-me@127.0.0.1:6379/0`.

## Production Setup

- `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `ADMIN_JWT_ACCESS_SECRET`, and `CSRF_SECRET` must be different high-entropy values.
- `JWT_ACCESS_EXPIRES_IN` must be short-lived, normally `15m`; this app rejects values above one hour.
- `JWT_REFRESH_EXPIRES_IN` must be bounded; this app rejects values above 30 days.
- `EMAIL_PROVIDER=smtp` with `EMAIL_FROM`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, and SMTP credentials where required.
- `OTP_PROVIDER` must be `msg91` or `twilio`; production rejects `mock`.
- `REDIS_URL` is required in production for distributed rate limits and queues.

## Google Console

- Configure an OAuth web client and set `GOOGLE_CLIENT_ID` on the backend.
- Set the same browser client ID as `VITE_GOOGLE_CLIENT_ID` on the frontend.
- Add the frontend domain to authorized JavaScript origins.
- Add only production and intended staging origins. Do not add wildcard origins.

## Facebook App

- Set `FACEBOOK_APP_ID` and `FACEBOOK_APP_SECRET` on the backend.
- Set `VITE_FACEBOOK_APP_ID` on the frontend.
- Enable Facebook Login and request the email permission.
- Configure valid OAuth redirect domains for the frontend domain.

## OTP Providers

- MSG91 requires `MSG91_AUTH_KEY`, `MSG91_TEMPLATE_ID`, and `MSG91_SENDER_ID`.
- Twilio Verify production should use `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, and `TWILIO_VERIFY_SERVICE_SID`.
- Set `OTP_RATE_LIMIT_HASH_SECRET` to a 32+ character secret for Twilio Verify rate-limit binding.
- Never log OTPs; provider logs should contain only provider/status metadata.

## Cookie And CORS

- `FRONTEND_ORIGIN` must be the exact browser origin allowed by CORS.
- `FRONTEND_URL` is used for reset and verification links.
- `BACKEND_PUBLIC_URL` should point to the externally reachable API origin when behind a proxy.
- `AUTH_COOKIE_DOMAIN` should be empty for same-host/local development. Use a parent domain only when frontend/backend are trusted subdomains under the same registrable domain.
- Refresh cookies are HttpOnly and Secure in production. Cross-site deployments use `SameSite=None`.

## Deployment Gate

- Install backend and frontend dependencies.
- Run backend lint, tests, and health/build check.
- Run frontend lint, tests, and production build.
- Run migration verification before deployment and apply migrations before serving new auth endpoints.
- Do not deploy if any auth test fails.

