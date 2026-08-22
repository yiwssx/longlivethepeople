const DEFAULT_MONGODB_URI = 'mongodb://localhost:27017/test';

export const parsePositiveInteger = (value: string | undefined, fallback: number): number => {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
};

const parseOrigins = (value: string | undefined, env: string): string[] => {
  if (!value) {
    return env === 'development'
      ? [
          'http://localhost:3000',
          'http://127.0.0.1:3000',
          'http://localhost:5173',
          'http://127.0.0.1:5173',
        ]
      : [];
  }

  return value.split(',').map((origin) => origin.trim()).filter(Boolean);
};

const parseTrustProxy = (value: string | undefined): boolean | number | string => {
  if (value === undefined || value === 'false') return false;
  if (value === 'true') return 1;

  const numeric = Number.parseInt(value, 10);
  return Number.isInteger(numeric) && numeric >= 0 ? numeric : value;
};

export const createEnvironment = (source: NodeJS.ProcessEnv = process.env) => {
  const env = source.NODE_ENV || 'development';

  if (env === 'production' && !source.MONGODB_URI) {
    throw new Error('Missing required production environment variable: MONGODB_URI');
  }

  return Object.freeze({
    env,
    port: source.PORT || 3000,
    trustProxy: parseTrustProxy(source.TRUST_PROXY),
    cors: { origins: parseOrigins(source.CORS_ORIGINS, env) },
    mongodb: {
      uri: source.MONGODB_URI || DEFAULT_MONGODB_URI,
      options: {
        serverSelectionTimeoutMS: parsePositiveInteger(source.MONGODB_SERVER_SELECTION_TIMEOUT_MS, 5_000),
      },
    },
    http: {
      bodyLimit: source.BODY_LIMIT || '16kb',
      shutdownTimeoutMs: parsePositiveInteger(source.SHUTDOWN_TIMEOUT_MS, 10_000),
    },
    socket: {
      maxHttpBufferSize: parsePositiveInteger(source.SOCKET_MAX_HTTP_BUFFER_SIZE, 64 * 1024),
      recoveryWindowMs: parsePositiveInteger(source.SOCKET_RECOVERY_WINDOW_MS, 120_000),
    },
    metrics: { token: source.METRICS_TOKEN || '' },
  });
};

export const environment = createEnvironment(process.env);
