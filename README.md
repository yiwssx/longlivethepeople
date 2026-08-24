# Long Live the People

An archived university-era memorial web application built with Node.js, Express, React, TypeScript, Vite, MongoDB, and Socket.IO.

This repository is preserved as an **archive project**. The original implementation was completed under a tight deadline after university. React was the intended frontend direction, but the available time favored EJS and vanilla JavaScript. The later restoration keeps the original purpose, wording, imagery, database compatibility, and public behavior while completing the intended React frontend and reorganizing the codebase around clearer application and feature boundaries.

## Architecture

The application remains a small modular monolith with two npm workspaces:

- `apps/web` — React + TypeScript frontend built by Vite.
- `apps/server` — TypeScript + ESM Express/MongoDB/Socket.IO server.
- `apps/server/src/app.ts` — defines the Express HTTP application: middleware, routes, static assets, and HTTP error handling.
- `apps/server/src/main.ts` — executable process entry point: database connection, HTTP server, Socket.IO lifecycle, listening, signals, and graceful shutdown.
- one root `package-lock.json` keeps the deployment dependency graph reproducible.
- Node.js 24 executes the server's erasable TypeScript directly; no runtime transpiler is required.
- MongoDB is the source of truth for messages.
- Socket.IO delivers committed messages in realtime.
- the browser periodically refreshes the newest page to heal missed realtime events.
- opaque cursor pagination loads older history incrementally.

See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for design rationale and [`docs/OPERATIONS.md`](docs/OPERATIONS.md) for deployment, backup, moderation, and recovery guidance.

## Requirements

- Node.js 24 (`>=24.0.0 <25`)
- npm 11+
- MongoDB for local/deployed runtime

Automated tests use `mongodb-memory-server`, so a separate MongoDB instance is not required for CI. Project install-script approvals are enforced by the root `allowScripts` policy together with `.npmrc` `strict-allow-scripts=true`; new install scripts require an explicit review instead of being silently accepted.

## Development

Install the locked workspace dependency graph:

```bash
npm ci
```

Start the server and Vite development server together:

```bash
npm run dev
```

Development endpoints:

- React/Vite: `http://127.0.0.1:5173`
- Express/API/Socket.IO: `http://127.0.0.1:3000`
- MongoDB default: `mongodb://localhost:27017/test`

Vite proxies API and Socket.IO traffic to Express, so browser development happens through port `5173` with HMR.

## Production

Build the frontend before starting the Node process:

```bash
npm ci
npm run typecheck
npm run build
NODE_ENV=production \
MONGODB_URI='mongodb://user:password@mongodb:27017/longlivethepeople' \
npm start
```

The generated frontend is stored under `dist/client/` and is served by Express. `NODE_ENV=production` requires `MONGODB_URI`; startup fails before accepting traffic when it is missing or MongoDB cannot be reached.

Common environment variables:

- `PORT` — HTTP port, default `3000`
- `MONGODB_URI` — required in production
- `MONGODB_SERVER_SELECTION_TIMEOUT_MS` — default `5000`
- `TRUST_PROXY` — default `false`; enable only behind the expected trusted proxy path
- `CORS_ORIGINS` — comma-separated explicit cross-origin browser origins
- `BODY_LIMIT` — JSON message body limit, default `16kb`
- `MESSAGE_PAGE_SIZE` — backend default message page size, default `20`, maximum `100`
- `MESSAGE_READ_RATE_LIMIT_WINDOW_MS` — default `60000`
- `MESSAGE_READ_RATE_LIMIT_MAX` — default `300`
- `MESSAGE_RATE_LIMIT_WINDOW_MS` — default `60000`
- `MESSAGE_RATE_LIMIT_MAX` — default `10`
- `SOCKET_MAX_HTTP_BUFFER_SIZE` — default `65536`
- `SOCKET_RECOVERY_WINDOW_MS` — default `120000`
- `SHUTDOWN_TIMEOUT_MS` — default `10000`
- `METRICS_TOKEN` — enables bearer-protected `/metrics` when configured

Do not enable `TRUST_PROXY` if untrusted clients can bypass the trusted reverse proxy and connect to Node directly.

## Browser compatibility

The production build contains both modern ESM and legacy SystemJS/polyfill bundles. The configured compatibility baseline is approximately:

- Chrome 80+
- Edge 80+
- Firefox 78+
- Safari 13+
- iOS Safari 13+

Internet Explorer is not supported. CI verifies that both bundle paths are emitted and that the strict CSP hashes generated for `@vitejs/plugin-legacy` match the installed plugin version.

## Operational endpoints

- `GET /healthz` — process liveness
- `GET /readyz` — MongoDB-backed readiness
- `GET /metrics` — disabled unless `METRICS_TOKEN` is configured; when enabled, requires `Authorization: Bearer <METRICS_TOKEN>`

## Message API

### `GET /api/v1/messages`

Returns stable newest-first cursor pagination. Query parameters:

- `limit` — positive integer up to `100`
- `before` — opaque cursor returned by the previous response

Public message records expose `id`, `codename`, `affiliation`, `message`, and `createdAt`.

### `POST /api/v1/messages`

Accepts `application/json` only with required `codename`, `affiliation`, and `message` fields. Requests are size-limited, validated, and rate-limited per IP. Successful writes return the committed public message and are broadcast over Socket.IO.

## Moderation

New messages are `published` by default. The model also supports `hidden` plus `hiddenAt`; public reads omit hidden rows. Historical archive rows that predate the moderation field remain visible.

The archive intentionally does not add an admin UI. See `docs/OPERATIONS.md` for the manual moderation baseline and the recommended path if active moderation is ever needed.

## Testing and verification

Install Chromium once before running browser-backed verification:

```bash
npx playwright install chromium
```

Run individual gates when diagnosing a failure:

```bash
npm run typecheck
npm run build
npm run verify:frontend
npm test
npm run test:dev
npm run test:e2e:ci
npm run audit:high
```

Run the same complete verification contract used by CI:

```bash
npm run verify:all
```

`npm run test:all` is retained as a compatibility alias for `npm run verify:all`. The browser coverage includes the landing flow, message publishing, Socket.IO delivery between two pages, incremental cursor history, a mobile viewport, and a development-runtime smoke test through the Vite proxy.

## Automated dependency maintenance

Dependabot performs weekly **npm-only** version maintenance at the workspace root. Automation is restricted to dependencies explicitly declared in this repository's `package.json` files; transitive dependencies remain owned by their direct parent packages and are not independently version-bumped by scheduled maintenance.

Related direct dependencies are grouped to reduce version skew:

- React / ReactDOM / React types
- Socket.IO server + client
- Vite / React SWC plugin / TypeScript
- browser legacy tooling
- server type packages
- integration/E2E test tooling
- development orchestration tooling

A direct dependency update may legitimately change transitive entries in the root `package-lock.json` because the selected parent package resolves a different dependency graph. That is different from independently targeting the transitive package itself.

Automatic merge is limited to Dependabot patch/minor PRs whose metadata identifies the update as a direct dependency and whose changed files are only `package.json` files plus the root `package-lock.json`. The complete CI verification gate must pass first. Major updates remain manual. `@vitejs/plugin-legacy` is more conservative: only patch updates are eligible for automatic merge because minor releases can change browser-support/runtime details and CSP hashes.

GitHub Actions versions are maintained manually rather than by scheduled Dependabot updates. Indirect/transitive security alerts may still be surfaced by GitHub, but they are not eligible for this direct-dependency auto-merge path and require explicit review.

## Project structure

```text
apps/
├── web/
│   ├── package.json
│   ├── vite.config.ts
│   ├── tsconfig.json
│   ├── index.html
│   ├── public/
│   │   └── assets/img/
│   └── src/
│       ├── app/
│       ├── features/
│       │   └── messages/
│       ├── pages/
│       ├── shared/
│       └── styles/
│
└── server/
    ├── package.json
    ├── tsconfig.json
    └── src/
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

tests/
├── server/
└── e2e/

docs/
├── ARCHITECTURE.md
└── OPERATIONS.md

scripts/
└── verify-frontend-build.mjs
```

`dist/` is generated and intentionally not committed.
