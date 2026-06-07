# Redis Configuration

GoldWallah uses Redis as shared infrastructure, not as the source of truth for
financial, KYC, bid, deal, or identity records. PostgreSQL remains authoritative.

## Current Uses

- BullMQ notification delivery jobs
- Redis pub/sub for authenticated server-sent notification streams
- Global API rate limiting
- Auth, OTP, admin, payment, notification-stream, and location rate limiting

## Local Development

Start Redis:

```bash
docker compose up -d redis
```

Default local URL:

```bash
REDIS_URL=redis://:goldwallah-local-redis-change-me@127.0.0.1:6379/0
```

To override the local password:

```bash
$env:GOLDWALLAH_REDIS_PASSWORD="replace-with-local-secret"
docker compose up -d redis
```

Then update `backend/.env`:

```bash
REDIS_URL=redis://:replace-with-local-secret@127.0.0.1:6379/0
```

## Production

Use a managed Redis/Key Value service reachable only from the backend private
network. On Render, `render.yaml` provisions `goldwallah-redis` as a private
Key Value service and injects its internal connection string into the backend.

Required production settings:

```bash
REDIS_URL=redis://...
BULLMQ_WORKER_ENABLED=true
NOTIFICATION_QUEUE_CONCURRENCY=5
NOTIFICATION_STREAM_HEARTBEAT_SECONDS=25
```

Redis must use `noeviction` for BullMQ. Queue state must not be evicted under
memory pressure because that can drop jobs or corrupt delivery accounting.

## Health

`GET /health` is liveness-only.

`GET /health/ready` checks PostgreSQL and Redis readiness without returning
connection strings, credentials, or internal hostnames.
