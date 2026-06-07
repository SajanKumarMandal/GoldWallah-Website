# GoldWallah

GoldWallah is a production-grade fintech marketplace where sellers list gold or jewellery items and verified jewellers privately bid on them.

## Repository Structure

```text
GoldWallah/
  frontend/   React + Vite app
  backend/    Node.js API
  README.md
  .gitignore
```

Frontend and backend live in folders in the same main repository. Use Git branches for features, for example `feature/landing-page`, `feature/backend-auth`, `feature/kyc-flow`, and `feature/bidding-system`.

## Core Marketplace Flow

1. Users land on a premium public landing page.
2. Users register or log in as Seller or Jeweller.
3. Sellers must complete approved KYC before listing gold.
4. Jewellers must complete approved KYC and business verification before bidding.
5. Sellers create gold listings.
6. Nearby verified jewellers are notified.
7. Jewellers place private bids.
8. Jewellers cannot see other jewellers' bid amounts.
9. Sellers see all bids and select the best bid.
10. The deal moves forward after seller selection.

## Non-Negotiable Rules

- Sellers cannot list without approved KYC.
- Jewellers cannot bid without approved KYC and business verification.
- Bids are private.
- Notifications must not leak bid amounts.
- Location-based matching is required.
- If no nearby items exist, show nearest fallback instead of an empty state.
- Admin approval is required for sensitive verification.
- Security and audit logs are mandatory for admin, KYC, listing, and bid actions.

## Frontend

Stack:

- React + Vite
- JavaScript and `.jsx` files only
- Tailwind CSS
- React Router DOM
- Fetch API through `src/services/httpClient.js`
- Absolute imports with `@` alias

Commands:

```bash
cd frontend
npm run lint
npm run build
```

## Backend

Current foundation:

- Node.js + Express
- JavaScript only
- Modular `src/modules/*` structure
- Central config, logging, security middleware, and error handling
- Health and module status endpoints
- Redis-backed rate limiting, BullMQ jobs, and real-time notification fanout

Planned production services:

- PostgreSQL with PostGIS
- Redis for cache, rate limiting, OTP, queues, pub/sub, and temporary data
- BullMQ for background jobs
- JWT auth with refresh token rotation
- Object storage/CDN for media and private documents
- WebSocket or SSE notifications backed by durable DB records

Commands:

```bash
cd backend
npm run lint
npm run check
```

### Local Redis

GoldWallah includes a local Redis service for development. It binds only to
`127.0.0.1`, requires a password, persists to a Docker volume, and uses
`noeviction` so BullMQ queue keys are not silently dropped.

```bash
docker compose up -d redis
```

On Windows without Docker, install the local Redis-compatible server once and
start it with the checked-in helper script:

```powershell
winget install --id taizod1024.redis-windows-fork --accept-source-agreements --accept-package-agreements --silent
.\scripts\start-local-redis.ps1
```

Use this backend environment value with the default local Compose password:

```bash
REDIS_URL=redis://:goldwallah-local-redis-change-me@127.0.0.1:6379/0
```

For a custom local password, set `GOLDWALLAH_REDIS_PASSWORD` before starting
Compose and update `REDIS_URL` accordingly.

Redis-backed features currently include:

- BullMQ notification delivery jobs
- Redis pub/sub for authenticated real-time notification streams
- Global API, auth, OTP, admin, payment, notification-stream, and location rate limits

Readiness can be checked at:

```bash
GET /health/ready
```

## Backend Modules

- Auth
- Users
- KYC
- Jeweller Business Verification
- Listings
- Bids
- Notifications
- Geo Matching
- Admin
- Media Upload
- Audit Logs
- Security/Fraud

## Architecture Principles

- Stateless APIs
- Load balancer friendly
- Horizontal scaling ready
- Redis-backed rate limiting and cache
- Queue heavy jobs
- Pagination everywhere, cursor pagination for feeds
- Avoid N+1 queries
- Database indexes for lookup, ownership, status, and geo filters
- Store notifications before pushing real-time events
- Never depend only on socket delivery
- Keep code modular enough to split into services later

## Security Principles

- Short-lived JWT access tokens
- Refresh token rotation
- Password hashing with argon2 or bcrypt
- Role-based authorization
- KYC and business-verification authorization
- Input validation on every request
- File upload validation
- Signed URLs for private documents
- Encryption for sensitive fields
- Helmet/security headers
- CORS locked to the frontend domain
- Audit logs for sensitive actions
