# Development

## What `npm run dev` starts

The root development command runs two long-lived processes:

1. the Node/Express server on `127.0.0.1:3000`;
2. the Vite development server on `127.0.0.1:5173`.

The server connects to MongoDB before it begins listening. Nodemon is explicitly configured to execute `node apps/server/src/main.ts`; Node.js 24 runs the erasable TypeScript directly, so the development runtime does not require `ts-node` or `tsx`.

The Vite process waits for `GET /readyz` to return successfully before it starts, so browser/API/Socket.IO proxy traffic is not sent to a backend that is still starting.

The default development MongoDB URI is `mongodb://localhost:27017/test`. Set `MONGODB_URI` when using another local or remote development database.

## Dependency install-script policy

The root `package.json` contains an explicit npm `allowScripts` policy and `.npmrc` enables `strict-allow-scripts`.

- `@swc/core` is allowed because the React SWC toolchain requires its platform setup.
- `mongodb-memory-server` is allowed because the test tool manages its MongoDB test binary.
- `core-js` install scripts are explicitly denied because its postinstall is not required by this application.

An unreviewed dependency that introduces a new install script now fails `npm ci` instead of producing a warning that can be overlooked. Review the package before adding it to `allowScripts`.

## Why Socket.IO can look noisy in development

The browser uses `socket.io-client`. During development, React StrictMode intentionally performs an extra Effect setup -> cleanup -> setup cycle. A Socket instance created and destroyed directly inside an Effect can therefore begin an Engine.IO/WebSocket handshake and then be disconnected before that handshake finishes. Browsers and the Vite proxy may report this as a failed `/socket.io` request even though the next connection succeeds.

The message feature avoids that race by owning one Socket.IO client in `apps/web/src/features/messages/socket.ts`. React Effects subscribe and unsubscribe listeners, while the shared connection uses reference counting and a deferred final disconnect. A StrictMode probe can immediately reacquire the same connection instead of aborting it mid-handshake.

Socket.IO automatically reconnects after a genuine temporary disconnect. Editing backend files causes nodemon to restart Express; a short disconnect/reconnect at that moment is expected. Repeated connection failures while the backend is otherwise idle are not expected.

## Interpreting common development errors

### `ts-node: not found`

Nodemon can infer `ts-node` when it sees a TypeScript entry file. This project intentionally does not use `ts-node`; the root development script overrides nodemon's executor with Node.js itself. Seeing this error means the development script has been changed or nodemon is being invoked directly without the repository script.

### `ECONNREFUSED 127.0.0.1:27017`

MongoDB is not reachable at the default URI. Start MongoDB or set `MONGODB_URI` to a reachable development database.

### Vite `http proxy error` for `/api` or `/socket.io`

The browser-facing Vite server cannot reach Express on port `3000`. On initial startup this should now be prevented by the readiness gate. If it persists, inspect the `server` process output; a MongoDB startup failure or an occupied port usually explains it.

### Socket.IO `connect_error` or failed `/socket.io` request

This means the browser client could not complete the Engine.IO transport connection to the Socket.IO server. In development the path is:

```text
browser :5173
    -> Vite proxy /socket.io
    -> Express HTTP server :3000
    -> Socket.IO
```

A persistent failure normally means the backend is down, the proxy target is wrong, or an origin/network rule blocks the handshake. It does not mean that React and the Socket.IO package versions are inherently incompatible.

## Build warnings

The web workspace declares `"type": "module"`, so Vite loads `vite.config.ts` as ESM instead of warning that ESM syntax is being read from a CommonJS package.

The legacy browser plugin intentionally performs a large share of this small application's build work because it generates the extra legacy bundle. Rolldown's `pluginTimings` notice is disabled specifically for that expected condition; other Rolldown/Vite correctness warnings remain enabled.

## Verification

The CI suite includes `npm run test:dev`. It launches an ephemeral MongoDB instance, runs the real `npm run dev` command, opens the Vite application in Chromium, verifies the API proxy and Socket.IO connection, and fails on unexpected browser/proxy connection errors.
