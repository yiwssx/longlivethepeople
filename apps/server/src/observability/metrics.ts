const startedAt = Date.now();

const counters = {
  httpRequestsTotal: 0,
  http4xxTotal: 0,
  http5xxTotal: 0,
  messagesCreatedTotal: 0,
  rateLimitedTotal: 0,
  socketConnectionsTotal: 0,
  socketConnectionsCurrent: 0,
};

type CounterName = keyof typeof counters;

export const increment = (name: CounterName, amount = 1): boolean => {
  if (!Object.prototype.hasOwnProperty.call(counters, name)) return false;
  counters[name] += amount;
  return true;
};

export const recordHttpStatus = (statusCode: number) => {
  increment('httpRequestsTotal');
  if (statusCode >= 500) increment('http5xxTotal');
  else if (statusCode >= 400) increment('http4xxTotal');
};

export const socketConnected = () => {
  increment('socketConnectionsTotal');
  increment('socketConnectionsCurrent');
};

export const socketDisconnected = () => {
  counters.socketConnectionsCurrent = Math.max(0, counters.socketConnectionsCurrent - 1);
};

export const snapshot = () => ({
  ...counters,
  uptimeSeconds: Math.floor((Date.now() - startedAt) / 1000),
  timestamp: new Date().toISOString(),
});

export default { increment, recordHttpStatus, socketConnected, socketDisconnected, snapshot };
