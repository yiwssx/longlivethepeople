# Operations

This is an archived project, not a service that requires enterprise infrastructure. These notes define a sensible production baseline if the archive is ever redeployed publicly.

## Deployment contract

Runtime baseline: Node.js 24 LTS.

Required in production:

- `NODE_ENV=production`
- `MONGODB_URI=<managed-or-backed-up-mongodb-uri>`

The React frontend must be built before the production Node process starts:

```bash
npm ci
npm run typecheck
npm run build
NODE_ENV=production MONGODB_URI='<uri>' npm start
```

`npm run build` writes the production application to `dist/client/` and writes the legacy-runtime CSP digests to `dist/legacy-csp.json`. These files are generated deployment artifacts and are intentionally not committed. A deployment must build them from the same locked dependency graph that it runs.

Optional runtime configuration:

- `PORT` — default `3000`
- `TRUST_PROXY` — default `false`; use `1` only behind exactly one trusted proxy hop
- `CORS_ORIGINS` — comma-separated explicit browser origins if cross-origin access is needed
- `BODY_LIMIT` — default `16kb`
- `MONGODB_SERVER_SELECTION_TIMEOUT_MS` — default `5000`
- `MESSAGE_PAGE_SIZE` — default `20`, maximum `100`
- `MESSAGE_READ_RATE_LIMIT_WINDOW_MS` — default `60000`
- `MESSAGE_READ_RATE_LIMIT_MAX` — default `300`
- `MESSAGE_RATE_LIMIT_WINDOW_MS` — default `60000`
- `MESSAGE_RATE_LIMIT_MAX` — default `10`
- `SOCKET_MAX_HTTP_BUFFER_SIZE` — default `65536`
- `SOCKET_RECOVERY_WINDOW_MS` — default `120000`
- `SHUTDOWN_TIMEOUT_MS` — default `10000`
- `METRICS_TOKEN` — enables authenticated `/metrics` when set

Do not expose the application directly to the Internet with `TRUST_PROXY` enabled. A client that can bypass the trusted proxy could forge forwarding headers and undermine IP-based controls.

## Frontend build integrity

CI type-checks React/TypeScript, creates both modern and legacy Vite bundles, and verifies that the generated CSP manifest matches the installed `@vitejs/plugin-legacy` runtime hashes. The production build should never be edited manually after this validation.

The legacy bundle is a compatibility path, not a second application. Both browser paths execute the same React source and use the same REST/Socket.IO backend.

## Health checks

Use:

- liveness: `GET /healthz`
- readiness: `GET /readyz`

A deployment/load balancer should send traffic only when readiness returns HTTP 200. A runtime MongoDB disconnection changes readiness to HTTP 503.

## Edge protection

For a public deployment, put the application behind a CDN/WAF or trusted reverse proxy. Recommended controls:

- HTTPS termination and HTTP-to-HTTPS redirect;
- request/body size limits at the edge as well as in Express;
- coarse IP/bot rate limiting for `/api/v1/messages`;
- stricter write rules for `POST /api/v1/messages` than reads;
- basic bot/challenge protection when abuse is detected;
- origin restriction so the Node service is not directly reachable when `TRUST_PROXY` is enabled.

Application rate limiting remains a second line of defense. It is intentionally in-process for this single-instance archive; it is not a distributed quota system.

## Moderation

New message documents default to `status: "published"`.

Operators can hide a message without deleting historical data by setting:

```json
{
  "status": "hidden",
  "hiddenAt": "<timestamp>"
}
```

Public reads exclude hidden rows. Documents from the original archive that have no `status` field remain visible.

For a high-traffic or legally sensitive deployment, add an authenticated moderation interface and audit trail rather than editing MongoDB directly.

## Backup and recovery

The messages collection is the primary historical asset of the project.

Recommended minimum policy for a redeployment:

- automated MongoDB backup at least daily;
- retain daily restore points for 30 days;
- retain a less frequent long-term archive according to project needs;
- encrypt backups at rest and restrict restore credentials;
- perform a restore test periodically rather than assuming a backup is usable.

Suggested service objectives for this archive:

- RPO (maximum acceptable data loss): 24 hours for baseline archival hosting; lower it if the site becomes actively used again;
- RTO (target restore time): 4 hours for baseline archival hosting.

Restore procedure:

1. stop writes or take the application offline;
2. restore the MongoDB backup into an isolated database first;
3. verify document count and sample recent/old messages;
4. point a staging instance at the restored database and run smoke/E2E checks;
5. switch production only after validation;
6. retain the failed database until the incident is understood.

## Metrics and logging

Each HTTP response includes `X-Request-Id`. Server logs are JSON and include request ID, method, path, status, and duration without logging message bodies or raw visitor IP addresses. IP addresses are used only transiently by the in-process rate limiter.

When `METRICS_TOKEN` is set:

```text
GET /metrics
Authorization: Bearer <METRICS_TOKEN>
```

returns lightweight per-process counters including:

- total HTTP requests;
- 4xx/5xx counts;
- messages created;
- rate-limit events;
- current/total Socket.IO connections;
- uptime.

These metrics are intentionally simple and per-process. If the application is horizontally scaled, aggregate observability in an external platform.

## Graceful deployment and shutdown

The process handles `SIGTERM` and `SIGINT` by closing Socket.IO, HTTP serving, and MongoDB. Deployment platforms should allow at least `SHUTDOWN_TIMEOUT_MS` before force-killing the process.

## Single-instance constraint

The repository's default architecture expects one Node process. Multiple replicas will each have independent in-memory rate-limit state and Socket.IO client sets. The browser's periodic database refresh prevents permanent feed divergence, but strict realtime fan-out and quotas require shared infrastructure.

If multiple replicas are genuinely needed, add shared rate-limit storage and a shared Socket.IO pub/sub adapter before treating the topology as fully horizontally scalable.

## Dependency maintenance

Dependabot groups dependencies that should move together. Auto-merge remains conditional on the complete CI gate, and major updates stay manual. Browser-compatibility tooling is intentionally more conservative: `@vitejs/plugin-legacy` minor and major updates require review even if CI succeeds.

## Incident checklist

If the application reports elevated errors:

1. check `/healthz` and `/readyz`;
2. correlate errors using `X-Request-Id` in JSON logs;
3. check MongoDB availability/latency;
4. inspect rate-limit and 4xx/5xx counters;
5. verify frontend build artifacts and CSP if browser assets fail to execute;
6. verify edge/proxy forwarding configuration;
7. if data integrity is uncertain, stop writes before attempting repair;
8. restore only from a verified backup and validate with tests before reopening traffic.
