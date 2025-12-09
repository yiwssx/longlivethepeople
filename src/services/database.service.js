const mongoose = require('mongoose');

const registerEvents = () => {
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
        console.log(`ERROR: ${error}`);
    });
};

const connect = async (uri, options) => {
    registerEvents();
    return mongoose.connect(uri, options);
};

module.exports = { connect };
