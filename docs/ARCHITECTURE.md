# Architecture

## Status

This repository is an archived university-era project that has been deliberately modernized without changing its original purpose. The original implementation used EJS and vanilla JavaScript because the project was time-constrained, although React was the intended frontend direction. The restoration now completes that frontend direction while retaining the existing Express, MongoDB, and Socket.IO backend.

It remains a **modular monolith**. Splitting this archive into microservices, adding a queue, or requiring Redis/Kubernetes would increase operational complexity without proportional value.

## Runtime topology

```text
Browser
  │
  │ React + TypeScript
  │ modern ESM or legacy bundle
  │
  ├── GET /, /memorial ───────────────┐
  ├── GET /api/v1/messages            │
  ├── POST /api/v1/messages           │
  └── Socket.IO                        │
                                       ▼
                              Node.js / Express
                              ├── Vite build output
                              ├── request context
                              ├── Helmet / CORS
                              ├── bounded rate limits
                              ├── message API
                              ├── health/readiness
                              ├── protected metrics
                              └── Socket.IO
                                       │
                                       ▼
                                    MongoDB
```

MongoDB is the source of truth. Socket.IO is an acceleration path for realtime display; the browser periodically re-reads the newest database page so a missed socket event does not create permanent divergence.

## Frontend boundary

The browser application lives under `frontend/` and is built by Vite.

- React owns rendering and UI state.
- TypeScript defines the message/API contracts.
- `socket.io-client` connects to the existing Socket.IO server.
- The POST response is the source of truth for the sending browser; Socket.IO provides realtime fan-out to other connected clients.
- Stable message IDs make REST and realtime delivery idempotent in the UI.
- Older history uses the existing opaque cursor and is loaded incrementally with `IntersectionObserver`; browsers without that API fall back to progressive automatic loading.
- A periodic database refresh repairs missed realtime events.

No global browser libraries, inline application scripts, Redux, React Router, Tailwind, or frontend data framework are required for this two-route application.

### Routing

Express serves the same production React shell for `GET /` and `GET /memorial`. The client uses the History API for navigation between those two routes while normal direct navigation and refresh remain server-compatible.

The original `POST /` redirect remains for historical bookmark/form compatibility.

### Build and browser compatibility

Vite emits hashed production assets under `dist/client/`. `@vitejs/plugin-legacy` also emits a legacy SystemJS/polyfill path for the configured browser baseline (Chrome/Edge 80+, Firefox 78+, Safari/iOS 13+). Internet Explorer is intentionally unsupported.

The legacy plugin requires a small set of fixed inline runtime snippets. Their CSP digests are imported from the installed plugin during every build and written to `dist/legacy-csp.json`. Express loads those generated hashes into Helmet's `script-src`, so legacy-tooling updates do not require hand-maintained CSP hashes.

## API layer

- `GET /api/v1/messages?limit=<n>&before=<cursor>` returns a stable cursor page.
- `POST /api/v1/messages` accepts JSON only.
- API errors are structured JSON and include a request ID.
- Request parsing is scoped to the API route rather than installed globally.

## Data layer

Messages are ordered deterministically by `createdAt DESC, _id DESC`. Public DTOs expose an `id` and `createdAt`; MongoDB metadata stays private.

The model supports `published` and `hidden` moderation states. Historical documents that predate the `status` field remain visible.

## Realtime layer

Socket.IO publishes newly committed messages. The server and browser client dependencies are maintained as a Dependabot group to reduce protocol-version skew. The default supported topology is one Node.js application instance.

If the archive is horizontally scaled, use a shared Socket.IO adapter/pub-sub layer and a distributed rate-limit store, or replace realtime delivery with a database-backed/edge-friendly mechanism.

## Reliability model

Production preparation is:

1. install locked dependencies;
2. build the Vite frontend and generated CSP manifest;
3. validate configuration;
4. connect to MongoDB;
5. create the HTTP server;
6. attach Socket.IO;
7. listen for traffic.

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
- React escapes message strings during rendering; user message content is not interpreted as HTML.
- Legacy inline runtime code is allowed only by generated SHA-256 CSP hashes rather than `unsafe-inline`.
- Runtime metrics require a bearer token and are otherwise disabled.

CORS is not an anti-CSRF or anti-abuse control. Internet-facing deployments should also apply edge/WAF rate limiting as documented in `OPERATIONS.md`.

## Why no session/authentication?

The project is a public memorial board. The original session value only remembered that a visitor clicked through the landing screen and did not protect the API. Keeping it required cookies, a session secret, and a MongoDB session store without providing an authorization boundary.

If private access is ever required, add real authentication/authorization rather than restoring the historical hidden-field gate.

## Testing strategy

CI validates the frontend and backend as one deployment unit:

1. `npm ci`;
2. TypeScript typecheck;
3. Vite modern + legacy production build;
4. generated frontend/CSP verification;
5. Jest + Supertest + MongoMemoryServer backend/integration tests;
6. Playwright + Chromium browser tests, including Socket.IO delivery between two pages and cursor history loading;
7. `npm audit --audit-level=high`.

## Dependency maintenance

Dependabot groups packages that should move together, including React, Socket.IO server/client, and the Vite toolchain. Patch/minor updates can be automatically merged only after the full CI gate passes. Major updates remain manual. `@vitejs/plugin-legacy` minor/major changes are also manual because they may change browser compatibility and inline runtime behavior.

## Scaling path (not required for the archive)

If usage ever exceeds a single application instance:

1. place the application behind a trusted load balancer/WAF;
2. move rate-limit state to a shared store or edge limiter;
3. add a Socket.IO Redis-compatible adapter/pub-sub layer (or replace Socket.IO with a stateless delivery design);
4. preserve MongoDB cursor pagination and message IDs unchanged;
5. aggregate logs/metrics outside the process.

The repository intentionally does not require those services today.
