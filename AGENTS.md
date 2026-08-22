# AGENTS.md

## Repository architecture

This repository is an archived application maintained as a small modular monolith. Prefer clear ownership and low complexity over framework-heavy abstractions.

## Server directives

- Server code lives in `apps/server/src` and uses TypeScript + ESM.
- Node.js 24 runs the server TypeScript directly. Keep runtime TypeScript limited to erasable syntax and explicit relative `.ts` imports; do not add `ts-node`, `tsx`, Babel, or another runtime transpiler without a concrete requirement.
- Organize business code by feature under `apps/server/src/modules`. The messages feature owns its model, routes, validation, cursor logic, constants, and application service.
- Keep HTTP routes thin: routing, middleware composition, status codes, and response mapping belong at the route boundary; persistence and application operations belong in the feature service.
- Shared runtime concerns belong in explicit top-level areas: `infrastructure` for MongoDB/realtime, `observability` for metrics, `middleware` for Express middleware, `http` for shared HTTP errors/responses, and `config` for runtime configuration.
- Do not introduce generic `controllers`, `services`, `models`, or `utils` buckets when a file clearly belongs to one feature.
- Preserve the existing REST API, MongoDB schema compatibility, Socket.IO behavior, health/readiness endpoints, request IDs, and graceful shutdown unless a change explicitly requires otherwise.
- Validate all external input at the HTTP boundary. Never expose secrets, raw stack traces, or message bodies in logs.
- Server tests live under `tests/server` and use Node's built-in `node:test`; browser integration tests live under `tests/e2e` and use Playwright.
- Keep `tsc --noEmit` as a required CI gate and run the full CI-equivalent checks before merging structural or runtime changes.
- Use npm only. Avoid new infrastructure or dependencies unless they solve a concrete requirement for this archive.
