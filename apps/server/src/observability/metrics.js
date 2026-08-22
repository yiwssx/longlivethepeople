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

const increment = (name, amount = 1) => {
    if (!Object.prototype.hasOwnProperty.call(counters, name)) {
        return false;
    }

    counters[name] += amount;
    return true;
};

const recordHttpStatus = (statusCode) => {
    increment('httpRequestsTotal');
    if (statusCode >= 500) {
        increment('http5xxTotal');
    } else if (statusCode >= 400) {
        increment('http4xxTotal');
    }
};

const socketConnected = () => {
    increment('socketConnectionsTotal');
    increment('socketConnectionsCurrent');
};

const socketDisconnected = () => {
    counters.socketConnectionsCurrent = Math.max(0, counters.socketConnectionsCurrent - 1);
};

const snapshot = () => ({
    ...counters,
    uptimeSeconds: Math.floor((Date.now() - startedAt) / 1000),
    timestamp: new Date().toISOString(),
});

module.exports = {
    increment,
    recordHttpStatus,
    socketConnected,
    socketDisconnected,
    snapshot,
};
