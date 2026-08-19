class AppError extends Error {
    constructor(status, code, message, options = {}) {
        super(message, options.cause ? { cause: options.cause } : undefined);
        this.name = this.constructor.name;
        this.status = status;
        this.code = code;
        this.expose = options.expose !== false;
    }
}

class DatabaseUnavailableError extends AppError {
    constructor() {
        super(503, 'DATABASE_UNAVAILABLE', 'Database is temporarily unavailable');
    }
}

class ValidationAppError extends AppError {
    constructor(message = 'Request data is invalid') {
        super(400, 'VALIDATION_ERROR', message);
    }
}

module.exports = {
    AppError,
    DatabaseUnavailableError,
    ValidationAppError,
};
