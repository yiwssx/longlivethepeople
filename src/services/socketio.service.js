const { Server } = require('socket.io');

const config = require('../config/config');
const metrics = require('./metrics.service');

let io;

const log = (event, extra = {}) => {
    if (process.env.NODE_ENV === 'test') {
        return;
    }
    console.log(JSON.stringify({ level: 'info', event, ...extra }));
};

const start = (server) => {
    const options = {
        maxHttpBufferSize: config.socket.maxHttpBufferSize,
        connectionStateRecovery: {
            maxDisconnectionDuration: config.socket.recoveryWindowMs,
            skipMiddlewares: true,
        },
    };

    if (config.cors.origins.length > 0) {
        options.cors = { origin: config.cors.origins };
    }

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

const emit = (event, payload) => {
    if (!event || !io) {
        return false;
    }

    io.emit(event, payload);
    return true;
};

const stop = async () => {
    if (!io) {
        return;
    }

    const active = io;
    io = undefined;
    await new Promise((resolve) => active.close(resolve));
};

const isStarted = () => Boolean(io);

module.exports = { start, emit, stop, isStarted };
