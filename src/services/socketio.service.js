const { Server } = require('socket.io');

let io;

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

const emit = (event, args) => {
    if (!event || !io) {
        return false;
    }

    return io.emit(event, args);
};

module.exports = { start, emit };
