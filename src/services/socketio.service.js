// Socket.IO wrapper that starts the server and exposes an emit helper
const { Server } = require('socket.io');

let io;

// Initialize Socket.IO on the provided HTTP server
const start = (server) => {
    io = new Server(server);

    io.on('connection', (socket) => {
        console.log('some people connected!');
        socket.on('disconnect', () => {
            console.log('some people disconnected!');
        });
    });

    return io;
};

// Emit events only when a server instance exists and an event name is provided
const emit = (event, args) => {
    if (!event || !io) {
        return false;
    }

    return io.emit(event, args);
};

module.exports = { start, emit };
