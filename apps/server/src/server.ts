#!/usr/bin/env node

import http, { type Server as HttpServer } from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import app from './app.ts';
import config from './config/index.ts';
import database from './infrastructure/database.ts';
import realtime from './infrastructure/realtime.ts';

export const normalizePort = (value: string | number): string | number | false => {
  const normalizedPort = Number.parseInt(String(value), 10);
  if (Number.isNaN(normalizedPort)) return value;
  if (normalizedPort >= 0) return normalizedPort;
  return false;
};

const listen = (server: HttpServer, port: string | number): Promise<void> => new Promise((resolve, reject) => {
  const onError = (error: Error) => {
    server.off('listening', onListening);
    reject(error);
  };
  const onListening = () => {
    server.off('error', onError);
    resolve();
  };
  server.once('error', onError);
  server.once('listening', onListening);
  server.listen(port);
});

const closeServer = (server: HttpServer): Promise<void> => new Promise((resolve, reject) => {
  if (!server.listening) return resolve();
  return server.close((error) => error ? reject(error) : resolve());
});

type StartServerOptions = {
  port?: string | number;
  registerSignalHandlers?: boolean;
};

export const startServer = async ({
  port: portOverride,
  registerSignalHandlers = true,
}: StartServerOptions = {}) => {
  const port = normalizePort(portOverride ?? config.port);
  if (port === false) throw new Error('Invalid server port');

  await database.connect(config.mongodb.uri, config.mongodb.options);
  const server = http.createServer(app);
  realtime.start(server);
  await listen(server, port);

  const address = server.address();
  const boundPort = typeof address === 'string' ? address : address?.port;
  if (boundPort === undefined) throw new Error('Server did not expose a listening address');

  if (config.env !== 'test') {
    console.log(JSON.stringify({ level: 'info', event: 'server_listening', port: boundPort }));
  }

  let shuttingDown = false;
  const signalHandlers = new Map<NodeJS.Signals, () => void>();

  const shutdown = async (reason = 'manual') => {
    if (shuttingDown) return;
    shuttingDown = true;
    for (const [signal, handler] of signalHandlers) process.off(signal, handler);

    const shutdownWork = (async () => {
      await realtime.stop();
      await closeServer(server);
      await database.disconnect();
    })();

    const timeout = new Promise<never>((_resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Graceful shutdown timed out after ${config.http.shutdownTimeoutMs}ms`));
      }, config.http.shutdownTimeoutMs);
      timer.unref();
    });

    await Promise.race([shutdownWork, timeout]);
    if (config.env !== 'test') {
      console.log(JSON.stringify({ level: 'info', event: 'server_stopped', reason }));
    }
  };

  if (registerSignalHandlers) {
    (['SIGTERM', 'SIGINT'] as const).forEach((signal) => {
      const handler = () => {
        shutdown(signal)
          .then(() => process.exit(0))
          .catch((error: Error) => {
            console.error(JSON.stringify({
              level: 'error',
              event: 'shutdown_failed',
              reason: signal,
              message: error.message,
            }));
            process.exit(1);
          });
      };
      signalHandlers.set(signal, handler);
      process.on(signal, handler);
    });
  }

  return { server, port: boundPort, shutdown };
};

const isMain = process.argv[1] !== undefined
  && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);

if (isMain) {
  startServer().catch((error: Error) => {
    console.error(JSON.stringify({ level: 'error', event: 'startup_failed', message: error.message }));
    process.exit(1);
  });
}
