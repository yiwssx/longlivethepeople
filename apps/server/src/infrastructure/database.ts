import mongoose, { type Connection, type ConnectOptions } from 'mongoose';

let listenersRegistered = false;
const CONNECTED_STATE = 1;
const CONNECTING_STATE = 2;

const shouldLog = () => process.env.NODE_ENV !== 'test';

const log = (level: 'info' | 'error', event: string, extra: Record<string, unknown> = {}) => {
  if (!shouldLog()) return;
  console[level === 'error' ? 'error' : 'log'](JSON.stringify({ level, event, ...extra }));
};

const registerEvents = () => {
  if (listenersRegistered) return;
  const connection = mongoose.connection;
  connection.on('connected', () => log('info', 'mongodb_connected'));
  connection.on('reconnected', () => log('info', 'mongodb_reconnected'));
  connection.on('disconnected', () => log('info', 'mongodb_disconnected'));
  connection.on('close', () => log('info', 'mongodb_closed'));
  connection.on('error', (error) => log('error', 'mongodb_error', { message: error.message }));
  listenersRegistered = true;
};

export const connect = async (uri: string, options: ConnectOptions = {}): Promise<Connection> => {
  registerEvents();
  if (mongoose.connection.readyState === CONNECTED_STATE) return mongoose.connection;
  if (mongoose.connection.readyState === CONNECTING_STATE) {
    await mongoose.connection.asPromise();
    return mongoose.connection;
  }
  await mongoose.connect(uri, options);
  return mongoose.connection;
};

export const isConnected = () => mongoose.connection.readyState === CONNECTED_STATE;

export const waitForConnection = async (timeoutMs = 1000): Promise<boolean> => {
  if (isConnected()) return true;
  if (mongoose.connection.readyState !== CONNECTING_STATE) return false;

  return Promise.race([
    mongoose.connection.asPromise().then(() => true).catch(() => false),
    new Promise<boolean>((resolve) => setTimeout(() => resolve(isConnected()), timeoutMs)),
  ]);
};

export const disconnect = async () => {
  if (mongoose.connection.readyState !== 0) await mongoose.connection.close();
};

export default { connect, disconnect, isConnected, waitForConnection };
