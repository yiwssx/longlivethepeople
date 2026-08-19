# Long Live the People

An archived university-era memorial web application built with Node.js, Express, EJS, MongoDB, and Socket.IO.

This repository is preserved as an **archive project**. Later maintenance intentionally applies engineering practices learned after the original implementation—security hardening, reliability, observability, stable pagination, automated testing, and clearer architecture—without rewriting the project into a different framework or adding infrastructure that its scope does not need.

## Current architecture

The application is a modular monolith:

- Express serves the EJS/static web experience and message API.
- MongoDB is the source of truth for messages.
- Socket.IO delivers new messages in realtime.
- The frontend periodically refreshes the newest database page to heal missed realtime events.
- The web layer is stateless; the original presentation-only session gate has been removed.

See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for design rationale and [`docs/OPERATIONS.md`](docs/OPERATIONS.md) for deployment, backup, moderation, and recovery guidance.

## Requirements

- Node.js `>=20.19.0`
- MongoDB for local/deployed runtime

Tests use `mongodb-memory-server`, so a separate MongoDB installation is not required for the automated test suites.

## Getting started

```bash
npm ci
npm run watch:dev
```

Development defaults to:

```text
MONGODB_URI=mongodb://localhost:27017/test
PORT=3000
```

Then open the archive landing page at `/` and enter the memorial at `/memorial`.

## Production configuration

`NODE_ENV=production` requires `MONGODB_URI`; startup fails before accepting traffic when it is missing or MongoDB cannot be reached.

Common environment variables:

- `PORT` — HTTP port, default `3000`
- `MONGODB_URI` — required in production
- `MONGODB_SERVER_SELECTION_TIMEOUT_MS` — default `5000`
- `TRUST_PROXY` — default `false`; enable only behind the expected trusted proxy path
- `CORS_ORIGINS` — comma-separated explicit cross-origin browser origins
- `BODY_LIMIT` — JSON message body limit, default `16kb`
- `MESSAGE_PAGE_SIZE` — default message page size, default `20`, maximum `100`
- `MESSAGE_READ_RATE_LIMIT_WINDOW_MS` — default `60000`
- `MESSAGE_READ_RATE_LIMIT_MAX` — default `300`
- `MESSAGE_RATE_LIMIT_WINDOW_MS` — default `60000`
- `MESSAGE_RATE_LIMIT_MAX` — default `10`
- `SOCKET_MAX_HTTP_BUFFER_SIZE` — default `65536`
- `SOCKET_RECOVERY_WINDOW_MS` — default `120000`
- `SHUTDOWN_TIMEOUT_MS` — default `10000`
- `METRICS_TOKEN` — enables bearer-protected `/metrics` when configured

Example:

```bash
NODE_ENV=production \
MONGODB_URI='mongodb://user:password@mongodb:27017/longlivethepeople' \
TRUST_PROXY=1 \
METRICS_TOKEN='replace-with-a-random-operations-token' \
npm start
```

Do not enable `TRUST_PROXY` if untrusted clients can bypass the trusted reverse proxy and connect to the Node process directly.

## Operational endpoints

### `GET /healthz`

Process liveness. Does not require the database to be healthy.

### `GET /readyz`

Application readiness. Returns `200` while MongoDB is connected and `503` when it is unavailable.

### `GET /metrics`

Disabled unless `METRICS_TOKEN` is set. When enabled, requires:

```text
Authorization: Bearer <METRICS_TOKEN>
```

The response contains lightweight per-process counters for HTTP errors, messages, rate limiting, Socket.IO connections, and uptime.

## Message API

### `GET /api/v1/messages`

Returns stable newest-first cursor pagination.

Query parameters:

- `limit` — positive integer up to `100`, default `20`
- `before` — opaque cursor returned by the previous response

Response:

```json
{
  "data": [
    {
      "id": "...",
      "codename": "...",
      "affiliation": "...",
      "message": "...",
      "createdAt": "2026-01-01T00:00:00.000Z"
    }
  ],
  "pagination": {
    "limit": 20,
    "hasMore": true,
    "nextCursor": "..."
  }
}
```

An empty database returns `200` with `data: []`. An unavailable database returns a structured `503` error.

### `POST /api/v1/messages`

Accepts `application/json` only:

```json
{
  "codename": "required, max 80 chars",
  "affiliation": "required, max 120 chars",
  "message": "required, max 2000 chars"
}
```

The request is body-limited, validated, and rate-limited per IP. A successful response returns the created public message including stable `id` and `createdAt` fields. Exceeding the rate limit returns `429` with `Retry-After`.

API errors use a consistent shape:

```json
{
  "error": {
    "code": "INVALID_MESSAGE",
    "message": "...",
    "requestId": "..."
  }
}
```

## Moderation

New messages are `published` by default. The data model also supports `hidden` plus `hiddenAt`; public reads omit hidden rows. Historical archive rows that predate the moderation field remain visible.

The repository intentionally does not add an admin UI to an archived public project. See `docs/OPERATIONS.md` for the manual moderation baseline and the recommended path if active moderation is ever needed.

## Testing

Backend/integration suite:

```bash
npm test
```

Browser E2E suite:

```bash
npx playwright install chromium
npm run test:e2e
```

All tests:

```bash
npm run test:all
```

CI runs backend tests, Chromium E2E tests, and `npm audit --audit-level=high`.

## Project structure

```text
public/                  Static assets and browser JavaScript
views/                   EJS templates
docs/
├── ARCHITECTURE.md      Architecture decisions and scaling path
└── OPERATIONS.md        Deployment, health, backup and incident guidance
src/
├── app.js               Express composition
├── server.js            Explicit startup + graceful shutdown
├── config/              Environment configuration and shared limits
├── controllers/         Message application operations
├── errors/              Typed application errors
├── http/                API response helpers
├── middleware/          Request context and rate limiting
├── models/              MongoDB models/indexes
├── routes/              Web, API and operations routes
├── services/            Database, realtime and metrics services
└── utils/               Cursor encoding/decoding
__tests__/
├── e2e/                 Playwright browser tests
└── *.test.js            Jest/Supertest integration tests
```

## Historical note

The original project was created after university with a focus on programming and visual design. The present cleanup is intentionally retrospective: it keeps the original idea and technology recognizable while documenting the reliability, security, data, testing, and operational concerns that were learned later.
