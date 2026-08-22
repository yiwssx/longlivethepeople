# AGENTS.md

## Repository architecture

This repository is an archived application maintained as a small modular monolith. Prefer clear ownership and low complexity over framework-heavy abstractions.

## Server directives

- Server code lives in `apps/server/src`.
- Organize business code by feature under `apps/server/src/modules`. The messages feature owns its model, routes, validation, cursor logic, constants, and application service.
- Keep HTTP routes thin: routing, middleware composition, status codes, and response mapping belong at the route boundary; persistence and application operations belong in the feature service.
- Shared runtime concerns belong in explicit top-level areas: `infrastructure` for MongoDB/realtime, `observability` for metrics, `middleware` for Express middleware, `http` for shared HTTP errors/responses, and `config` for runtime configuration.
- Do not introduce generic `controllers`, `services`, `models`, or `utils` buckets when a file clearly belongs to one feature.
- Preserve the existing REST API, MongoDB schema compatibility, Socket.IO behavior, health/readiness endpoints, request IDs, and graceful shutdown unless a change explicitly requires otherwise.
- Validate all external input at the HTTP boundary. Never expose secrets, raw stack traces, or message bodies in logs.
- Tests live under `tests/server` and `tests/e2e`. Run the full CI-equivalent checks before merging structural or runtime changes.
- Use npm only. Avoid new infrastructure or dependencies unless they solve a concrete requirement for this archive.
