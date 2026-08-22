import { io, type Socket } from 'socket.io-client';
import type { MessageRecord } from './types';

type ServerToClientEvents = {
  message: (message: MessageRecord) => void;
};

const socket: Socket<ServerToClientEvents> = io({ autoConnect: false });

let consumers = 0;
let disconnectTimer: number | null = null;

const cancelScheduledDisconnect = () => {
  if (disconnectTimer === null) return;
  window.clearTimeout(disconnectTimer);
  disconnectTimer = null;
};

export const acquireMessageSocket = () => {
  consumers += 1;
  cancelScheduledDisconnect();
  return socket;
};

export const releaseMessageSocket = () => {
  consumers = Math.max(0, consumers - 1);
  if (consumers > 0 || disconnectTimer !== null) return;

  // React StrictMode intentionally performs an extra setup -> cleanup -> setup
  // cycle in development. Deferring the final disconnect by one task lets the
  // immediate re-subscription cancel it instead of aborting an in-flight
  // Engine.IO/WebSocket handshake. A real unmount still disconnects promptly.
  disconnectTimer = window.setTimeout(() => {
    disconnectTimer = null;
    if (consumers === 0) socket.disconnect();
  }, 0);
};
