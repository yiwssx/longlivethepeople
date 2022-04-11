const { Server } = require('socket.io');
const io = new Server();

const start = (server) => {
    return io.listen(server)
    .on('connection', (socket) => {
        console.log('some people connected!');
        socket.on('disconnect', () => {
          console.log('some people disconnected!');
        });
      });
}

const emit = (event, args) => {
    if(event === undefined && args === undefined) {
        return false;
    }
    return io.emit(event, args);
} 

module.exports = {start, emit};