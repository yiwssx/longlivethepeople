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

Environment variables:

- `PORT` (default: `3000`)
- `MONGODB_URI` (default: `mongodb://localhost:27017/test`)
- `SESSION_SECRET` (default: `longlivethepeople`)

## Project structure

```
public/              # Static assets
views/               # EJS templates
src/
├── app.js           # Express app configuration
├── server.js        # HTTP server + Socket.IO bootstrap
├── config/          # Application configuration
├── controllers/     # Route controllers
├── models/          # Database models
├── routes/          # Express routes
└── services/        # Infrastructure services (database, socket)
```
