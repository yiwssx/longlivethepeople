#!/usr/bin/env node

const http = require('http');

const app = require('./app');
const config = require('./config/config');
const databaseService = require('./services/database.service');
const io = require('./services/socketio.service');

const normalizePort = (value) => {
    const normalizedPort = Number.parseInt(value, 10);

    if (Number.isNaN(normalizedPort)) {
        return value;
    }

    if (normalizedPort >= 0) {
        return normalizedPort;
    }

    return false;
};

const listen = (server, port) => new Promise((resolve, reject) => {
    const onError = (error) => {
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

const closeServer = (server) => new Promise((resolve, reject) => {
    if (!server.listening) {
        resolve();
        return;
    }

    server.close((error) => {
        if (error) {
            reject(error);
            return;
        }
        resolve();
    });
});

const startServer = async ({
    port: portOverride,
    registerSignalHandlers = true,
} = {}) => {
    const port = normalizePort(portOverride ?? config.port);

    await databaseService.connect(config.mongodb.uri, config.mongodb.options);

    const server = http.createServer(app);
    io.start(server);
    await listen(server, port);

    const address = server.address();
    const boundPort = typeof address === 'string' ? address : address.port;

    if (config.env !== 'test') {
        console.log(JSON.stringify({
            level: 'info',
            event: 'server_listening',
            port: boundPort,
        }));
    }

    let shuttingDown = false;
    const signalHandlers = new Map();

    const shutdown = async (reason = 'manual') => {
        if (shuttingDown) {
            return;
        }
        shuttingDown = true;

        for (const [signal, handler] of signalHandlers) {
            process.off(signal, handler);
        }

        const shutdownWork = (async () => {
            await io.stop();
            await closeServer(server);
            await databaseService.disconnect();
        })();

        const timeout = new Promise((resolve, reject) => {
            const timer = setTimeout(() => {
                reject(new Error(`Graceful shutdown timed out after ${config.http.shutdownTimeoutMs}ms`));
            }, config.http.shutdownTimeoutMs);
            timer.unref();
        });

        await Promise.race([shutdownWork, timeout]);

        if (config.env !== 'test') {
            console.log(JSON.stringify({
                level: 'info',
                event: 'server_stopped',
                reason,
            }));
        }
    };

    if (registerSignalHandlers) {
        ['SIGTERM', 'SIGINT'].forEach((signal) => {
            const handler = () => {
                shutdown(signal)
                    .then(() => process.exit(0))
                    .catch((error) => {
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

    return {
        server,
        port: boundPort,
        shutdown,
    };
};

if (require.main === module) {
    startServer().catch((error) => {
        console.error(JSON.stringify({
            level: 'error',
            event: 'startup_failed',
            message: error.message,
        }));
        process.exit(1);
    });
}

module.exports = { startServer, normalizePort };
