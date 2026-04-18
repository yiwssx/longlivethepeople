// Database utility functions for establishing and closing MongoDB connections
const mongoose = require('mongoose');

let listenersRegistered = false;
const CONNECTED_STATE = 1;
const CONNECTING_STATE = 2;

const shouldLog = () => process.env.NODE_ENV !== 'test';

const logInfo = (message) => {
    if (shouldLog()) {
        console.log(message);
    }
};

const logError = (message) => {
    if (shouldLog()) {
        console.error(message);
    }
};

// Register event listeners only once to avoid duplicate logging
const registerEvents = () => {
    if (listenersRegistered) {
        return;
    }

    const server = mongoose.connection;

    server.on('connected', () => logInfo('Connection Established'));

    server.on('reconnected', () => logInfo('Connection Reestablished'));

    server.on('disconnected', () => logInfo('Connection Disconnected'));

    server.on('close', () => logInfo('Connection Closed'));

    server.on('error', (error) => {
        logError(`ERROR: ${error}`);
    });

    listenersRegistered = true;
};

// Connect to MongoDB while ensuring event listeners are attached first
const connect = async (uri, options) => {
    registerEvents();
    return mongoose.connect(uri, options);
};

const isConnected = () => mongoose.connection.readyState === CONNECTED_STATE;

const waitForConnection = async (timeoutMs = 1000) => {
    if (isConnected()) {
        return true;
    }

    if (mongoose.connection.readyState !== CONNECTING_STATE) {
        return false;
    }

    return Promise.race([
        mongoose.connection.asPromise()
            .then(() => true)
            .catch(() => false),
        new Promise((resolve) => {
            setTimeout(() => resolve(isConnected()), timeoutMs);
        }),
    ]);
};

// Gracefully close the active MongoDB connection
const disconnect = async () => mongoose.connection.close();

module.exports = { connect, disconnect, isConnected, waitForConnection };
