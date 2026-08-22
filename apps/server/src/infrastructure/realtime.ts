import type { Server as HttpServer } from 'node:http';
import { Server, type ServerOptions } from 'socket.io';
import config from '../config/index.ts';
import metrics from '../observability/metrics.ts';

let io: Server | undefined;

const log = (event: string, extra: Record<string, unknown> = {}) => {
  if (process.env.NODE_ENV !== 'test') {
    console.log(JSON.stringify({ level: 'info', event, ...extra }));
  }
};

export const start = (server: HttpServer): Server => {
  const options: Partial<ServerOptions> = {
    maxHttpBufferSize: config.socket.maxHttpBufferSize,
    connectionStateRecovery: {
      maxDisconnectionDuration: config.socket.recoveryWindowMs,
      skipMiddlewares: true,
    },
  };

  if (config.cors.origins.length > 0) options.cors = { origin: config.cors.origins };

  io = new Server(server, options);
  io.on('connection', (socket) => {
    metrics.socketConnected();
    log('socket_connected', { socketId: socket.id });
    socket.on('disconnect', (reason) => {
      metrics.socketDisconnected();
      log('socket_disconnected', { socketId: socket.id, reason });
    });
  });
  return io;
};

export const emit = (event: string, payload: unknown): boolean => {
  if (!event || !io) return false;
  io.emit(event, payload);
  return true;
};

export const stop = async () => {
  if (!io) return;
  const active = io;
  io = undefined;
  await new Promise<void>((resolve) => active.close(() => resolve()));
};

export const isStarted = () => Boolean(io);

export default { start, emit, stop, isStarted };
