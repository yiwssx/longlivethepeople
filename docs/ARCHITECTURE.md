# Architecture

## Status

This repository is an archived university-era project that has been deliberately modernized without changing its original purpose. The original implementation used EJS and vanilla JavaScript because the project was time-constrained, although React was the intended frontend direction. The restoration now completes that frontend direction and reorganizes the server into explicit feature and infrastructure boundaries while preserving the Express, MongoDB, and Socket.IO runtime model.

It remains a **modular monolith**. Splitting this archive into microservices, adding a queue, or requiring Redis/Kubernetes would increase operational complexity without proportional value.

## Repository boundaries

The repository uses npm workspaces to make dependency ownership explicit while retaining one root lockfile:

- `apps/web` owns the React/Vite browser application and `socket.io-client`.
- `apps/server` owns the Express/Mongoose/Socket.IO server.
- `tests/server` contains Node `node:test` unit/integration coverage.
- `tests/e2e` contains Playwright browser coverage.
- root scripts orchestrate development, typechecking, build, tests, and CI as one deployable system.

The server is TypeScript + ESM. Node.js 24 executes its erasable TypeScript directly, so production does not require `ts-node`, `tsx`, Babel, or a server transpilation step. `tsc --noEmit` is the static type gate.

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

## Web application boundary

The browser application lives under `apps/web` and is built by Vite.

- `src/app` owns bootstrap and the intentionally small two-route navigation layer.
- `src/pages` owns route-level composition.
- `src/features/messages` owns message API types, client calls, realtime state, form behavior, and feed rendering.
- `src/shared` contains genuinely reusable UI such as the archive dialog.
- `src/styles` contains global styling.
- `public` owns the original static image assets.

React owns rendering and UI state. The POST response is the source of truth for the sending browser; Socket.IO provides realtime fan-out to other connected clients. Stable message IDs make REST and realtime delivery idempotent in the UI. Older history uses the opaque cursor and is loaded incrementally with `IntersectionObserver`; browsers without that API fall back to progressive automatic loading. A periodic database refresh repairs missed realtime events.

No global browser libraries, inline application scripts, Redux, React Router, Tailwind, or frontend data framework are required for this two-route application.

### Routing

Express serves the same production React shell for `GET /` and `GET /memorial`. The client uses the History API for navigation between those two routes while normal direct navigation and refresh remain server-compatible.

The original `POST /` redirect remains for historical bookmark/form compatibility.

### Build and browser compatibility

Vite emits hashed production assets under `dist/client/`. `@vitejs/plugin-legacy` also emits a legacy SystemJS/polyfill path for the configured browser baseline (Chrome/Edge 80+, Firefox 78+, Safari/iOS 13+). Internet Explorer is intentionally unsupported.

The legacy plugin requires a small set of fixed inline runtime snippets. Their CSP digests are imported from the installed plugin during every build and written to `dist/legacy-csp.json`. Express loads those generated hashes into Helmet's `script-src`, so legacy-tooling updates do not require hand-maintained CSP hashes.

## Server application boundary

The server lives under `apps/server/src` and is organized around feature ownership instead of generic MVC buckets.

```text
apps/server/src/
├── app.ts
├── main.ts
├── config/
├── http/
├── infrastructure/
├── middleware/
├── modules/
│   └── messages/
├── observability/
├── routes/
└── types/
```

`app.ts` defines the HTTP application only: Express configuration, middleware, static assets, routes, fallback behavior, and HTTP error handling. Importing it must not open a port, connect to MongoDB, start Socket.IO, register process signals, or terminate the process.

`main.ts` is the executable process entry point and lifecycle owner. It connects MongoDB, creates the Node HTTP server around the Express app, attaches Socket.IO, starts listening, registers `SIGTERM`/`SIGINT` handlers, and coordinates graceful shutdown. It exports `startServer()` so integration/E2E tests can start the real runtime on an ephemeral port without production signal handlers.

`modules/messages` owns the message model, routes, validation, cursor encoding, limits/constants, and application service. Shared runtime concerns are separated by responsibility: MongoDB and Socket.IO live under `infrastructure`, counters under `observability`, shared API errors/responses under `http`, and Express middleware under `middleware`.

The HTTP route layer is intentionally thin. External input is normalized and validated at the boundary; persistence/application operations remain in the message service. A repository/DI abstraction layer is deliberately avoided because it would add indirection without useful substitution needs for this archive.

## API layer

- `GET /api/v1/messages?limit=<n>&before=<cursor>` returns a stable cursor page.
- `POST /api/v1/messages` accepts JSON only.
- API errors are structured JSON and include a request ID.
- Request parsing is scoped to the API route rather than installed globally.

## Data layer

Messages are ordered deterministically by `createdAt DESC, _id DESC`. Public DTOs expose an `id` and `createdAt`; MongoDB metadata stays private.

The model supports `published` and `hidden` moderation states. Historical documents that predate the `status` field remain visible.

## Realtime layer

Socket.IO publishes newly committed messages. The server and browser client dependencies are maintained as one Dependabot group to reduce protocol-version skew. The default supported topology is one Node.js application instance.

If the archive is horizontally scaled, use a shared Socket.IO adapter/pub-sub layer and a distributed rate-limit store, or replace realtime delivery with a database-backed/edge-friendly mechanism.

## Reliability model

Production preparation is:

1. install locked workspace dependencies;
2. type-check both applications;
3. build the Vite frontend and generated CSP manifest;
4. validate runtime configuration;
5. connect to MongoDB;
6. create the HTTP server;
7. attach Socket.IO;
8. listen for traffic.

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
- npm install scripts are governed by explicit root `allowScripts` approvals and `.npmrc` strict enforcement.

CORS is not an anti-CSRF or anti-abuse control. Internet-facing deployments should also apply edge/WAF rate limiting as documented in `OPERATIONS.md`.

## Why no session/authentication?

The project is a public memorial board. The original session value only remembered that a visitor clicked through the landing screen and did not protect the API. Keeping it required cookies, a session secret, and a MongoDB session store without providing an authorization boundary.

If private access is ever required, add real authentication/authorization rather than restoring the historical hidden-field gate.

## Testing strategy

The canonical verification contract is `npm run verify:all`. CI installs Chromium and then runs that contract so local and CI verification do not maintain separate command lists.

The gate validates the frontend and backend as one deployment unit:

1. TypeScript static checks for server and web;
2. Vite modern + legacy production build;
3. generated frontend/CSP verification;
4. Node `node:test` + Supertest + MongoMemoryServer server/integration tests;
5. a real development-runtime smoke test through Express, Vite proxying, MongoDB, Chromium, and Socket.IO;
6. Playwright browser E2E coverage including realtime delivery and cursor history loading;
7. `npm audit --audit-level=high`.

`npm run test:all` remains a compatibility alias for the same complete gate.

## Dependency maintenance

Dependabot performs scheduled npm version maintenance from the workspace root, but only for dependencies explicitly declared in repository `package.json` files. Indirect/transitive dependencies remain owned by their direct parent package and are not independently targeted by scheduled version updates.

Direct React packages, Socket.IO server/client, Vite/TypeScript tooling, server type packages, test tooling, and development orchestration dependencies are grouped where version alignment is useful. A direct package upgrade may naturally change transitive resolutions in the shared `package-lock.json`; those lockfile changes are accepted only as consequences of the selected direct parent update.

Patch/minor auto-merge requires all of the following: Dependabot metadata must classify the update as `direct:production` or `direct:development`; the PR must change at least one `package.json`; changed files must be limited to `package.json` files and the root `package-lock.json`; and the complete CI gate must pass. Major updates remain manual. `@vitejs/plugin-legacy` minor/major changes also remain manual because they may change browser compatibility and inline runtime behavior.

Scheduled GitHub Actions updates are intentionally disabled because Actions are not dependencies declared in this project's `package.json` files. Indirect security alerts can still be surfaced by GitHub, but they do not enter the direct-dependency auto-merge path and require explicit review.

## Scaling path (not required for the archive)

If usage ever exceeds a single application instance:

1. place the application behind a trusted load balancer/WAF;
2. move rate-limit state to a shared store or edge limiter;
3. add a Socket.IO Redis-compatible adapter/pub-sub layer (or replace Socket.IO with a stateless delivery design);
4. preserve MongoDB cursor pagination and message IDs unchanged;
5. aggregate logs/metrics outside the process.

The repository intentionally does not require those services today.
