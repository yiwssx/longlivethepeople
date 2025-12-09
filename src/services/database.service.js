// Database utility functions for establishing and closing MongoDB connections
const mongoose = require('mongoose');

let listenersRegistered = false;

// Register event listeners only once to avoid duplicate logging
const registerEvents = () => {
    if (listenersRegistered) {
        return;
    }

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

    listenersRegistered = true;
};

// Connect to MongoDB while ensuring event listeners are attached first
const connect = async (uri, options) => {
    registerEvents();
    return mongoose.connect(uri, options);
};

// Gracefully close the active MongoDB connection
const disconnect = async () => mongoose.connection.close();

module.exports = { connect, disconnect };
