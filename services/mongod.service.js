const mongoose = require('mongoose');

const run = async (URI, options) => {
    const server = mongoose.connection;

    server.on('connected', () => {
        console.log('Connection Established');
    });

    server.on('reconnected', () => {
        console.log('Connection Reestablished');
    });

    server.on('disconnected', () => {
        console.log('Connection Disconnected');
    });

    server.on('close', () => {
        console.log('Connection Closed');
    });

    server.on('error', (error) => {
        console.log('ERROR: ' + error);
    });

    return mongoose.connect(URI, options);;
};

module.exports = run;