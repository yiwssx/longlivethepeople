# Long Live the People

An archived university-era memorial web application built with Node.js, Express, React, TypeScript, Vite, MongoDB, and Socket.IO.

This repository is preserved as an **archive project**. The original implementation was completed under a tight deadline after university. React was the intended frontend direction, but the available time favored an EJS/vanilla-JavaScript implementation. The later restoration keeps the original purpose, wording, imagery, API, and backend recognizable while completing that intended React frontend and applying engineering practices learned afterward.

## Current architecture

The application remains a modular monolith:

- React + TypeScript provide the browser UI.
- Vite builds modern and legacy browser bundles.
- Express serves the production frontend and message API.
- MongoDB is the source of truth for messages.
- Socket.IO delivers committed messages in realtime.
- The frontend periodically refreshes the newest database page to heal missed realtime events.
- Cursor pagination loads older history incrementally instead of downloading the entire archive at startup.
- The web layer is stateless.

See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for design rationale and [`docs/OPERATIONS.md`](docs/OPERATIONS.md) for deployment, backup, moderation, and recovery guidance.

## Requirements

- Node.js 24 LTS (`>=24.0.0 <25`)
- MongoDB for local/deployed runtime

Tests use `mongodb-memory-server`, so a separate MongoDB installation is not required for the automated test suites.

## Development

Install the locked dependency graph:

```bash
npm ci
```

Start Express and the Vite development server together:

```bash
npm run dev
```

Development uses:

- React/Vite: `http://127.0.0.1:5173`
- Express/API/Socket.IO: `http://127.0.0.1:3000`
- MongoDB default: `mongodb://localhost:27017/test`

Vite proxies API and Socket.IO requests to Express, so normal browser development happens through port `5173` with hot module replacement.

## Production

Build the frontend before starting the Node process:

```bash
npm ci
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

Do not enable `TRUST_PROXY` if untrusted clients can bypass the trusted reverse proxy and connect to the Node process directly.

## Browser compatibility

The production build contains both modern ESM and legacy SystemJS/polyfill bundles. The configured compatibility baseline is approximately:

- Chrome 80+
- Edge 80+
- Firefox 78+
- Safari 13+
- iOS Safari 13+

Internet Explorer is not supported. CI verifies that both modern and legacy bundles are emitted and that the strict CSP hashes generated for `@vitejs/plugin-legacy` match the installed plugin version.

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

Accepts `application/json` only with required `codename`, `affiliation`, and `message` fields. Requests are size-limited, validated, and rate-limited per IP. Successful writes return the committed public message and are also broadcast over Socket.IO.

## Moderation

New messages are `published` by default. The data model also supports `hidden` plus `hiddenAt`; public reads omit hidden rows. Historical archive rows that predate the moderation field remain visible.

The repository intentionally does not add an admin UI to an archived public project. See `docs/OPERATIONS.md` for the manual moderation baseline and the recommended path if active moderation is ever needed.

## Testing

Type-check the React frontend:

```bash
npm run typecheck
```

Build production bundles:

```bash
npm run build
```

Backend/integration suite:

```bash
npm test
```

Browser E2E suite:

```bash
npx playwright install chromium
npm run test:e2e
```

The E2E suite covers the landing flow, message publishing, Socket.IO delivery between two browser pages, incremental cursor history, and a mobile viewport.

## Automated dependency maintenance

Dependabot checks npm dependencies and GitHub Actions weekly. Related packages are grouped to reduce version skew:

- React / ReactDOM / React types
- Socket.IO server + client
- Vite / React SWC plugin / TypeScript
- browser legacy tooling
- test tooling

Low-risk patch/minor updates may merge automatically only after the complete CI gate succeeds. Major updates remain manual. `@vitejs/plugin-legacy` is more conservative: only patch updates are eligible for automatic merge because minor releases can change browser-support/runtime details and CSP hashes.

## Project structure

```text
frontend/
├── index.html
├── tsconfig.json
└── src/
    ├── components/
    ├── hooks/
    ├── lib/
    ├── pages/
    ├── styles/
    ├── types/
    ├── App.tsx
    └── main.tsx
public/
└── assets/img/          Original image assets
scripts/
└── verify-frontend-build.mjs
docs/
├── ARCHITECTURE.md
└── OPERATIONS.md
src/
├── app.js
├── server.js
├── config/
├── controllers/
├── errors/
├── http/
├── middleware/
├── models/
├── routes/
├── services/
└── utils/
__tests__/
├── e2e/
└── *.test.js
vite.config.ts
```

`dist/` is generated and intentionally not committed.
