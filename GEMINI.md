# GEMINI.md

## Web application directives

- The React/Vite frontend lives in `apps/web`.
- Organize code by feature. Message-related API types, client calls, realtime state, form, and feed components belong together in `apps/web/src/features/messages`.
- Keep route-level composition in `apps/web/src/pages`, application bootstrap/navigation in `apps/web/src/app`, genuinely reusable UI in `apps/web/src/shared`, and global styling in `apps/web/src/styles`.
- Do not recreate generic `components`, `hooks`, `lib`, or `types` buckets when code belongs to a single feature.
- Preserve the archived user-facing wording exactly. Do not invent, modernize, soften, or add visible copy unless explicitly requested.
- Use React + TypeScript and modern CSS. Do not add Redux, Tailwind, React Router, or another frontend framework without a concrete requirement.
- Keep `socket.io-client` aligned with the server's `socket.io` dependency and preserve realtime deduplication plus the periodic healing refresh.
- Keep the message Socket.IO client lifecycle compatible with React StrictMode. Reuse the feature-owned singleton in `features/messages/socket.ts`; do not create and immediately destroy a new Socket instance inside each Effect setup.
- Development Vite startup must remain gated on backend `/readyz` so the browser is not exposed to predictable startup proxy/socket connection failures while MongoDB and Express are still starting.
- Maintain the configured legacy-browser build and generated CSP hash verification.
- Keep accessibility semantics and keyboard behavior intact when changing UI structure.
