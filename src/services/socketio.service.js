// Socket.IO wrapper that starts the server and exposes an emit helper.
const { Server } = require('socket.io');

const config = require('../config/config');

let io;

const logConnection = (message) => {
    if (process.env.NODE_ENV !== 'test') {
        console.log(message);
    }
};

// Initialize Socket.IO on the provided HTTP server with a bounded payload size.
const start = (server) => {
    const options = {
        maxHttpBufferSize: config.socket.maxHttpBufferSize,
    };

    if (config.cors.origins.length > 0) {
        options.cors = { origin: config.cors.origins };
    }

    io = new Server(server, options);

    io.on('connection', (socket) => {
        logConnection('some people connected!');
        socket.on('disconnect', () => {
            logConnection('some people disconnected!');
        });
    });

    return io;
};

// Emit events only when a server instance exists and an event name is provided.
const emit = (event, args) => {
    if (!event || !io) {
        return false;
    }

    return io.emit(event, args);
};

module.exports = { start, emit };
