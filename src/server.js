#!/usr/bin/env node

// Server bootstrap script responsible for starting the HTTP server
const http = require('http');
const debug = require('debug')('longlivethepeople:server');

const app = require('./app');
const config = require('./config/config');
const io = require('./services/socketio.service');

// Normalize the port and configure the Express app to use it
const port = normalizePort(config.port);
app.set('port', port);

const server = http.createServer(app);
io.start(server);

server.listen(port);
server.on('error', onError);
server.on('listening', onListening);

// Ensure ports passed in via environment or string values are valid numbers
function normalizePort(val) {
    const normalizedPort = parseInt(val, 10);

    if (Number.isNaN(normalizedPort)) {
        return val;
    }

    if (normalizedPort >= 0) {
        return normalizedPort;
    }

    return false;
}

// Provide friendly logging and exits for common server startup errors
function onError(error) {
    if (error.syscall !== 'listen') {
        throw error;
    }

    const bind = typeof port === 'string'
        ? `Pipe ${port}`
        : `Port ${port}`;

    switch (error.code) {
    case 'EACCES':
        console.error(`${bind} requires elevated privileges`);
        process.exit(1);
        break;
    case 'EADDRINUSE':
        console.error(`${bind} is already in use`);
        process.exit(1);
        break;
    default:
        throw error;
    }
}

// Log out the bound address once the server is ready to receive traffic
function onListening() {
    const addr = server.address();
    const bind = typeof addr === 'string'
        ? `pipe ${addr}`
        : `port ${addr.port}`;
    debug(`Listening on ${bind}`);
}
