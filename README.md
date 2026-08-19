# Long Live the People

A lightweight Express application that serves EJS views and exposes a small message API.

## Getting started

1. Install dependencies:
   ```bash
   npm install
   ```
2. Start the server in development mode:
   ```bash
   npm run watch:dev
   ```
   or run without file watching:
   ```bash
   npm run server
   ```

## Environment variables

Development defaults are provided for local use. In `NODE_ENV=production`, both `MONGODB_URI` and `SESSION_SECRET` are required and the process fails fast if either is missing.

- `PORT` — HTTP port, default `3000`
- `MONGODB_URI` — MongoDB connection string; required in production
- `SESSION_SECRET` — strong random session secret; required in production
- `TRUST_PROXY` — Express trust-proxy value; defaults to `1` in production and `false` otherwise
- `CORS_ORIGINS` — comma-separated list of explicitly allowed cross-origin browser origins; omit for same-origin production traffic
- `BODY_LIMIT` — maximum JSON/form request body size, default `16kb`
- `MESSAGE_PAGE_SIZE` — default GET page size, default `50`, capped at `100`
- `MESSAGE_RATE_LIMIT_WINDOW_MS` — POST rate-limit window, default `60000`
- `MESSAGE_RATE_LIMIT_MAX` — maximum message POSTs per IP in each window, default `10`
- `SOCKET_MAX_HTTP_BUFFER_SIZE` — Socket.IO HTTP payload limit in bytes, default `65536`

Example production configuration:

```bash
NODE_ENV=production \
MONGODB_URI='mongodb://user:password@mongodb:27017/longlivethepeople' \
SESSION_SECRET='replace-with-a-long-random-secret' \
npm start
```

## Message API

### `GET /api/v1/messages`

Returns messages newest-first as a JSON array. Query parameters:

- `page` — positive integer, default `1`
- `limit` — positive integer up to `100`, default `50`

The response includes `X-Page` and `X-Limit` headers. A healthy database with no matching rows returns `204`. An unavailable database returns `503`.

### `POST /api/v1/messages`

Accepts JSON with:

- `codename` — required string, maximum 80 characters
- `affiliation` — required string, maximum 120 characters
- `message` — required string, maximum 2000 characters

Requests are rate-limited per IP. Exceeding the limit returns `429` with a `Retry-After` header. An unavailable database returns `503`.

## Testing

```bash
npm test
```

The integration suite uses `mongodb-memory-server`, so a separately installed MongoDB instance is not required for tests.

## Project structure

```text
public/              # Static assets
views/               # EJS templates
src/
├── app.js           # Express app configuration
├── server.js        # HTTP server + Socket.IO bootstrap
├── config/          # Application configuration and shared limits
├── controllers/     # Route controllers
├── middleware/      # Request middleware such as rate limiting
├── models/          # Database models
├── routes/          # Express routes
└── services/        # Infrastructure services (database, socket)
```
