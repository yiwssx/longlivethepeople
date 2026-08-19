# Architecture

## Status

This repository is an archived university-era project that has been deliberately modernized without changing its original purpose. The goal of the maintenance work is to preserve the project while documenting and applying engineering practices learned after the original implementation.

It remains a **modular monolith**. That is intentional: splitting this archive into microservices, adding a queue, or requiring Redis/Kubernetes would increase operational complexity without improving the historical project proportionally.

## Runtime topology

```text
Browser
  │
  ├── GET /, /memorial ───────────────┐
  ├── GET /api/v1/messages            │
  ├── POST /api/v1/messages           │
  └── Socket.IO                        │
                                       ▼
                              Node.js / Express
                              ├── request context
                              ├── Helmet / CORS
                              ├── bounded rate limits
                              ├── EJS/static frontend
                              ├── message API
                              ├── health/readiness
                              ├── protected metrics
                              └── Socket.IO
                                       │
                                       ▼
                                    MongoDB
```

MongoDB is the source of truth. Socket.IO is an acceleration path for realtime display; the browser periodically re-reads the newest database page so a missed socket event does not create permanent divergence.

## Application boundaries

### Web layer

- `GET /` renders the archive landing page.
- `GET /memorial` renders the message application.
- The original hidden-field/session gate was removed because it was presentation state, not authentication or authorization.
- The web layer is stateless.

### API layer

- `GET /api/v1/messages?limit=<n>&before=<cursor>` returns a stable cursor page.
- `POST /api/v1/messages` accepts JSON only.
- API errors are structured JSON and include a request ID.
- Request parsing is scoped to the API route rather than installed globally.

### Data layer

Messages are ordered deterministically by `createdAt DESC, _id DESC`. Public DTOs expose an `id` and `createdAt`; MongoDB metadata stays private.

The model supports `published` and `hidden` moderation states. Historical documents that predate the `status` field remain visible.

### Realtime layer

Socket.IO publishes newly committed messages. Client-side ID deduplication makes the POST response and socket delivery idempotent from the UI perspective. A periodic database refresh repairs missed realtime events.

The default supported topology is one Node.js application instance. If the archive is ever horizontally scaled, use a shared Socket.IO adapter/pub-sub layer and a distributed rate-limit store, or replace realtime delivery with a database-backed/edge-friendly mechanism.

## Reliability model

Startup is explicit:

1. validate configuration;
2. connect to MongoDB;
3. create HTTP server;
4. attach Socket.IO;
5. listen for traffic.

Operational endpoints:

- `/healthz` — process liveness;
- `/readyz` — MongoDB-backed readiness;
- `/metrics` — runtime counters, disabled unless `METRICS_TOKEN` is configured.

Shutdown on `SIGTERM`/`SIGINT` closes realtime connections, HTTP serving, and MongoDB before the process exits.

## Security boundaries

- Helmet and a narrow CSP are applied globally.
- Production requires `MONGODB_URI`.
- `TRUST_PROXY` defaults to false and must only be enabled behind a trusted proxy.
- Message POSTs are JSON-only, size-limited, field-whitelisted, length-validated, and rate-limited.
- Message reads have a higher separate rate limit to reduce database scraping/DoS pressure.
- Frontend rendering uses DOM `textContent`, so stored message text is not interpreted as HTML.
- Runtime metrics require a bearer token and are otherwise disabled.

CORS is not an anti-CSRF or anti-abuse control. Internet-facing deployments should also apply edge/WAF rate limiting as documented in `OPERATIONS.md`.

## Why no session/authentication?

The project is a public memorial board. The original session value only remembered that a visitor clicked through the landing screen and did not protect the API. Keeping it required cookies, a session secret, and a MongoDB session store without providing an authorization boundary. Removing it makes the application genuinely stateless and easier to reason about.

If private access is ever required, add real authentication/authorization rather than restoring the historical hidden-field gate.

## Testing strategy

- Jest + Supertest + MongoMemoryServer: API, configuration, database failure modes, health/readiness, rate limiting, and lifecycle contracts.
- Playwright + Chromium: the user journey, realtime message display, cursor load-more behavior, and a mobile viewport.
- CI also runs `npm audit --audit-level=high`.

## Scaling path (not required for the archive)

If usage ever exceeds a single application instance:

1. place the application behind a trusted load balancer/WAF;
2. move rate-limit state to a shared store or edge limiter;
3. add a Socket.IO Redis-compatible adapter/pub-sub layer (or replace Socket.IO with a stateless delivery design);
4. preserve MongoDB cursor pagination and message IDs unchanged;
5. aggregate logs/metrics outside the process.

The repository intentionally does not require those services today.
